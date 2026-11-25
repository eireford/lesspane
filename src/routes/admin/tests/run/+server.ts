import * as env from '$app/env/private';
import { json } from '@sveltejs/kit';
import { canStart, runScreenshotTest, type AdminAccess } from '#lib/server/screenshots/runner.ts';
import type { RequestHandler } from './$types';

// Starts the screenshot test and streams its progress as NDJSON, one line per event. Streaming keeps the request
// open for the whole run, which is also what keeps Cloud Run's CPU allocated to it. /admin/* is owner-only
// (hooks.server.ts); a cross-site form can't post here either, as the body must be JSON.
export const POST: RequestHandler = async ({ request, url, locals }) => {
	if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Send JSON.' }, { status: 415 });
	const refused = await canStart();
	if (refused) return json({ error: refused }, { status: 409 });

	const access: AdminAccess = locals.admin ? { email: locals.admin } : env.ADMIN_PASSWORD ? { password: env.ADMIN_PASSWORD } : null;
	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			let open = true;
			const send = (event: object) => {
				if (!open) return;
				try {
					controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
				} catch {
					open = false; // The page was closed; the run carries on and is saved.
				}
			};
			runScreenshotTest(url.origin, locals.admin ?? 'admin', access, send)
				.catch((e) => send({ type: 'error', message: e instanceof Error ? e.message : String(e) }))
				.finally(() => {
					if (open) controller.close();
				});
		}
	});
	return new Response(stream, { headers: { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store', 'x-accel-buffering': 'no' } });
};
