import { error } from '@sveltejs/kit';
import { getShot } from '#lib/server/screenshots/runs.ts';
import type { RequestHandler } from './$types';

// One screenshot of a run. Owner-only like all of /admin; a run's screenshots never change, so the browser may
// keep them (privately) for a day.
export const GET: RequestHandler = async ({ params }) => {
	const image = await getShot(params.run, Number(params.index));
	if (!image) error(404, 'No such screenshot.');
	return new Response(new Uint8Array(image), {
		headers: { 'content-type': 'image/webp', 'cache-control': 'private, max-age=86400, immutable', 'content-length': String(image.length) }
	});
};
