import { redirect } from '@sveltejs/kit';
import { computeQuote } from '$lib/pricing';
import { homeToSearchParams, parseHomeDetails } from '$lib/validation';
import type { PageServerLoad } from './$types';

// Screen 3: "Your quote". The price is always computed on the server from validated input.
export const load: PageServerLoad = ({ url }) => {
	const result = parseHomeDetails(url.searchParams);
	if (!result.ok) {
		const back = new URLSearchParams(url.searchParams);
		back.set('err', '1');
		redirect(303, `/quote?${back}`);
	}

	const details = result.value;
	return {
		details,
		quote: computeQuote(details),
		query: homeToSearchParams(details).toString()
	};
};
