import { json } from '@sveltejs/kit';
import { OrderError } from '#lib/server/orders.ts';
import { agentTools, allowAgentRequest, errorBody, runAgentTool, tooMany } from '#lib/server/agent-api.ts';
import type { RequestHandler } from './$types';

// The HTTP API for outside AI agents: the same operations as the MCP tools (agent-api.ts), described at
// /openapi.json. JSON in, JSON out; refusals are 4xx with {error: {code, message}}, never a 200.

/** Matches a request to an operation, pulling `{booking_token}` out of the path. */
function route(method: string, path: string) {
	for (const tool of agentTools) {
		if (tool.http.method !== method) continue;
		const pattern = new RegExp(`^${tool.http.path.replace('{booking_token}', '(?<booking_token>[^/]+)')}$`);
		const m = pattern.exec(path);
		if (m) return { tool, params: { ...m.groups } };
	}
	return null;
}

const handle: RequestHandler = async ({ request, params, url, getClientAddress }) => {
	if (!allowAgentRequest(request, getClientAddress)) return tooMany();
	const found = route(request.method, `/${params.path}`);
	if (!found) {
		return json({ error: { code: 'not_found', message: `No such operation. See ${url.origin}/openapi.json.` } }, { status: 404 });
	}

	let args: Record<string, unknown> = { ...found.params };
	if (request.method === 'GET') {
		for (const [k, v] of url.searchParams) args[k] = v;
	} else if ((request.headers.get('content-length') ?? '') !== '0') {
		try {
			const body = await request.text();
			const parsed = body ? JSON.parse(body) : {};
			if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
			args = { ...parsed, ...args };
		} catch {
			return json({ error: { code: 'invalid_json', message: 'Send a JSON object.' } }, { status: 400 });
		}
	}
	const key = request.headers.get('idempotency-key');
	if (key && found.tool.name === 'request_booking') args.request_id = key;

	try {
		const result = await runAgentTool(found.tool.name, args, { origin: url.origin, client: request.headers.get('user-agent') ?? '' });
		const status = found.tool.name === 'request_booking' && !result.repeated ? 201 : 200;
		return json(result, { status, headers: { 'cache-control': 'no-store' } });
	} catch (e) {
		if (e instanceof OrderError) return json(errorBody(e), { status: e.status });
		throw e;
	}
};

export const GET = handle;
export const POST = handle;
