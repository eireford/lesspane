// Browser side of the AI agents demo (/agents/demo): calls LessPane's own agent endpoints exactly as an outside
// agent would, over MCP (/mcp) or the HTTP API (/api/v1), and keeps the raw request for display.

export type Protocol = 'mcp' | 'http';
export type ToolInfo = { name: string; title: string; description: string; readOnly: boolean; http: { method: 'GET' | 'POST'; path: string } };

export type Exchange = {
	/** The request as it went over the wire, for display. */
	request: string;
	status: number;
	/** The parsed answer (for MCP, the JSON-RPC message with its text copy shortened). */
	body: unknown;
	/** The tool's result alone: structuredContent for MCP, the JSON body for HTTP. */
	result: Record<string, any> | null;
	/** True when LessPane refused (MCP isError, or HTTP 4xx). */
	refused: boolean;
	ms: number;
};

export const MCP_VERSION = '2025-11-25';
let rpcId = 0;

const pretty = (v: unknown) => JSON.stringify(v, null, 2);

/** One JSON-RPC message to /mcp. */
export async function mcp(method: string, params?: object): Promise<Exchange> {
	const payload = { jsonrpc: '2.0', id: ++rpcId, method, ...(params && { params }) };
	const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': MCP_VERSION };
	const started = performance.now();
	const res = await fetch('/mcp', { method: 'POST', headers, body: JSON.stringify(payload) });
	const body = await res.json().catch(() => null);
	const result = body?.result ?? null;
	// structuredContent first, since that's what matters; the text copy of it is shortened.
	const shown = result?.content
		? {
				...body,
				result: {
					...(result.structuredContent && { structuredContent: result.structuredContent }),
					...result,
					content: result.content.map((c: any) => ({ ...c, text: c.text?.length > 80 ? '(the same answer as structuredContent, as text)' : c.text }))
				}
			}
		: body;
	return {
		request: `POST /mcp\ncontent-type: application/json\nmcp-protocol-version: ${MCP_VERSION}\n\n${pretty(payload)}`,
		status: res.status,
		body: shown,
		result: result?.structuredContent ?? result,
		refused: res.status >= 400 || !!result?.isError || !!body?.error,
		ms: Math.round(performance.now() - started)
	};
}

/** The same tool over the HTTP API: GET with a query string, POST with a JSON body. */
export async function http(tool: ToolInfo, args: Record<string, unknown>): Promise<Exchange> {
	const url = `/api/v1${tool.http.path}`;
	const started = performance.now();
	let res: Response;
	let request: string;
	if (tool.http.method === 'GET') {
		const qs = new URLSearchParams(Object.entries(args).map(([k, v]) => [k, String(v)])).toString();
		const full = qs ? `${url}?${qs}` : url;
		res = await fetch(full);
		request = `GET ${full}`;
	} else {
		res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(args) });
		request = `POST ${url}\ncontent-type: application/json\n\n${pretty(args)}`;
	}
	const body = await res.json().catch(() => null);
	return { request, status: res.status, body, result: body, refused: res.status >= 400, ms: Math.round(performance.now() - started) };
}

export function callTool(protocol: Protocol, tool: ToolInfo, args: Record<string, unknown>): Promise<Exchange> {
	return protocol === 'mcp' ? mcp('tools/call', { name: tool.name, arguments: args }) : http(tool, args);
}

/** The same call as a command anyone can paste into a terminal. */
export function curlFor(protocol: Protocol, origin: string, tool: ToolInfo, args: Record<string, unknown>): string {
	if (protocol === 'mcp') {
		const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: tool.name, arguments: args } });
		return `curl -s ${origin}/mcp \\\n  -H 'content-type: application/json' \\\n  -H 'accept: application/json, text/event-stream' \\\n  -H 'mcp-protocol-version: ${MCP_VERSION}' \\\n  -d '${body.replace(/'/g, "'\\''")}'`;
	}
	if (tool.http.method === 'GET') {
		const qs = new URLSearchParams(Object.entries(args).map(([k, v]) => [k, String(v)])).toString();
		return `curl -s '${origin}/api/v1${tool.http.path}${qs ? `?${qs}` : ''}'`;
	}
	return `curl -s ${origin}/api/v1${tool.http.path} \\\n  -H 'content-type: application/json' \\\n  -d '${JSON.stringify(args).replace(/'/g, "'\\''")}'`;
}

export const tooManyText = 'LessPane allows 20 agent requests a minute from one address, and this page counts too. Wait a minute and try again.';
