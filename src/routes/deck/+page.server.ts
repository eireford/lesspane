import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// A short feature tour for showing people the prototype. Staging (lesspane.net) and local only; production
// customers never see it.
export const load: PageServerLoad = () => {
	if (!dev && env.APP_ENV !== 'staging') error(404, 'Not found');
};
