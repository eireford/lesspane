import { json } from '@sveltejs/kit';
import { business } from '#lib/config.ts';
import { appVersion } from '#lib/version.ts';
import { OrderError } from '#lib/server/orders.ts';
import { agentInstructions, agentTools, allowAgentRequest, errorBody, runAgentTool, tooMany } from '#lib/server/agent-api.ts';
import type { RequestHandler } from './$types';

// The MCP server for outside AI agents (Streamable HTTP, stateless, no sign-in). Each POST is one JSON-RPC message
// answered with one JSON response: no sessions, no server-sent events, no server-to-client requests. The tools are
// the same operations as the HTTP API (agent-api.ts). See docs/agent-ordering-plan.md.

const VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26'];

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

const reply = (id: Rpc['id'], result: unknown) => json({ jsonrpc: '2.0', id, result });
const failure = (id: Rpc['id'], code: number, message: string, status = 200) =>
	json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, { status });

const tools = () =>
	agentTools.map((t) => ({
		name: t.name,
		title: t.title,
		description: t.description,
		inputSchema: t.inputSchema,
		annotations: { title: t.title, readOnlyHint: t.readOnly, destructiveHint: !t.readOnly && t.name === 'cancel_booking', idempotentHint: t.idempotent, openWorldHint: false }
	}));

export const POST: RequestHandler = async ({ request, url, getClientAddress }) => {
	if (!allowAgentRequest(request, getClientAddress)) return tooMany();
	const asked = request.headers.get('mcp-protocol-version');
	if (asked && !VERSIONS.includes(asked)) return failure(null, -32600, `Unsupported MCP-Protocol-Version ${asked}.`, 400);

	let msg: Rpc;
	try {
		msg = await request.json();
	} catch {
		return failure(null, -32700, 'Parse error: send one JSON-RPC message.', 400);
	}
	if (Array.isArray(msg) || !msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
		return failure(null, -32600, 'Invalid request: send one JSON-RPC 2.0 message (batches are not supported).', 400);
	}
	// Notifications (no id) and responses need no answer.
	if (msg.id === undefined) return new Response(null, { status: 202 });

	switch (msg.method) {
		case 'initialize': {
			const wanted = String(msg.params?.protocolVersion ?? '');
			return reply(msg.id, {
				protocolVersion: VERSIONS.includes(wanted) ? wanted : VERSIONS[0],
				capabilities: { tools: { listChanged: false } },
				serverInfo: {
					name: 'lesspane',
					title: `${business.name}: window cleaning on Maryland's Eastern Shore`,
					version: appVersion,
					websiteUrl: url.origin
				},
				instructions: agentInstructions()
			});
		}
		case 'ping':
			return reply(msg.id, {});
		case 'tools/list':
			return reply(msg.id, { tools: tools() });
		case 'tools/call': {
			const name = String(msg.params?.name ?? '');
			if (!agentTools.some((t) => t.name === name)) return failure(msg.id, -32602, `Unknown tool ${name}.`);
			const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
			const clientName = request.headers.get('user-agent') ?? '';
			try {
				const result = await runAgentTool(name, args, { origin: url.origin, client: `mcp ${clientName}`.trim() });
				return reply(msg.id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result, isError: false });
			} catch (e) {
				if (!(e instanceof OrderError)) throw e;
				// A refusal is a tool result the model can read and act on, not a protocol error.
				const body = errorBody(e);
				return reply(msg.id, { content: [{ type: 'text', text: JSON.stringify(body, null, 2) }], structuredContent: body, isError: true });
			}
		}
		default:
			return failure(msg.id, -32601, `Method not found: ${msg.method}.`);
	}
};

/** No server-to-client stream and no sessions to end. */
const notAllowed: RequestHandler = () => new Response('Use POST.', { status: 405, headers: { Allow: 'POST' } });
export const GET = notAllowed;
export const DELETE = notAllowed;
