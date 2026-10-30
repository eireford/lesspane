import { getRequest } from '$lib/server/store';
import type { PageServerLoad } from './$types';

// Screen 5: "Confirmation". Shows only a non-sensitive summary of the request.
export const load: PageServerLoad = async ({ url }) => {
	const id = url.searchParams.get('id') ?? '';
	const record = /^[0-9a-f-]{36}$/i.test(id) ? await getRequest(id) : null;

	return {
		summary: record
			? {
					firstName: record.name.split(' ')[0],
					total: record.quoted_price,
					date: record.preferred_date,
					window: record.preferred_window,
					email: record.email
				}
			: null
	};
};
