import { error } from '@sveltejs/kit';
import { business } from '#lib/config.ts';
import type { PageServerLoad } from './$types';

// "How it's built": for people looking at LessPane as a piece of work. Only in showcase mode.
export const load: PageServerLoad = () => {
	if (!business.showcase.enabled) error(404, 'Not found');
};
