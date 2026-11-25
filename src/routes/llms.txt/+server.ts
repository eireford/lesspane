import { agentGuideText } from '#lib/agent-guide.ts';
import type { RequestHandler } from './$types';

// /llms.txt: what an AI agent needs to order from LessPane, as Markdown (the same guide as /agents).
export const GET: RequestHandler = ({ url }) =>
	new Response(agentGuideText(url.origin), {
		headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'public, max-age=300' }
	});
