import { json } from '@sveltejs/kit';
import { business } from '#lib/config.ts';
import { appVersion } from '#lib/version.ts';
import { agentTools } from '#lib/server/agent-api.ts';
import type { RequestHandler } from './$types';

// The HTTP API's description, built from the same tool definitions as the MCP server, so the two can't drift.

const errorResponse = { description: 'Refused: `error.code` says why and `error.message` what to do.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } };

export const GET: RequestHandler = ({ url }) => {
	const paths: Record<string, Record<string, unknown>> = {};
	for (const t of agentTools) {
		const path = `/api/v1${t.http.path}`;
		const props = (t.inputSchema.properties ?? {}) as Record<string, Record<string, unknown>>;
		const required = new Set((t.inputSchema.required as string[] | undefined) ?? []);
		const inPath = t.http.path.includes('{booking_token}') ? ['booking_token'] : [];
		const parameters = [
			...inPath.map((name) => ({ name, in: 'path', required: true, schema: props[name] })),
			...(t.http.method === 'GET'
				? Object.entries(props)
						.filter(([name]) => !inPath.includes(name))
						.map(([name, schema]) => ({ name, in: 'query', required: required.has(name), schema }))
				: []),
			...(t.name === 'request_booking'
				? [{ name: 'Idempotency-Key', in: 'header', required: false, schema: { type: 'string' }, description: 'Same as request_id.' }]
				: [])
		];
		const bodyProps = Object.fromEntries(Object.entries(props).filter(([name]) => !inPath.includes(name)));
		paths[path] ??= {};
		paths[path][t.http.method.toLowerCase()] = {
			operationId: t.name,
			summary: t.title,
			description: t.description,
			...(parameters.length && { parameters }),
			...(t.http.method === 'POST' &&
				Object.keys(bodyProps).length && {
					requestBody: {
						required: required.size > inPath.length,
						content: {
							'application/json': {
								schema: { ...t.inputSchema, properties: bodyProps, required: [...required].filter((r) => !inPath.includes(r)) }
							}
						}
					}
				}),
			responses: {
				[t.name === 'request_booking' ? '201' : '200']: { description: 'Done.', content: { 'application/json': { schema: { type: 'object' } } } },
				'400': errorResponse,
				'404': errorResponse,
				'409': errorResponse,
				'429': errorResponse
			}
		};
	}
	return json(
		{
			openapi: '3.1.0',
			info: {
				title: `${business.name} ordering API`,
				version: appVersion,
				description: `Window cleaning on Maryland's Eastern Shore, for AI agents acting for a customer. Read ${url.origin}/agents first. The same operations are MCP tools at ${url.origin}/mcp.${business.showcase.enabled ? ' LessPane is currently a demo: bookings are not real.' : ''}`
			},
			servers: [{ url: url.origin }],
			paths,
			components: {
				schemas: {
					Error: {
						type: 'object',
						properties: { error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } }, required: ['code', 'message'] } },
						required: ['error']
					}
				}
			}
		},
		{ headers: { 'cache-control': 'public, max-age=300' } }
	);
};
