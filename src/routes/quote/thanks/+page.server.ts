import { firstName } from '$lib/contact';
import { getRequest, getRequestByManageToken } from '$lib/server/store';
import type { PageServerLoad } from './$types';

// Screen 5: "Confirmation". Shows only a non-sensitive summary of the request, plus the "manage your booking"
// link when the request's own secret came along (straight after booking; the same link is in the email).
export const load: PageServerLoad = async ({ url, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	const id = url.searchParams.get('id') ?? '';
	const token = url.searchParams.get('t') ?? '';
	const record = /^[0-9a-f-]{36}$/i.test(id) ? await getRequest(id) : null;
	const owns = record && token ? (await getRequestByManageToken(token))?.id === record.id : false;

	return {
		summary: record
			? {
					firstName: firstName(record),
					total: record.quoted_price,
					date: record.preferred_date,
					window: record.preferred_window,
					email: record.email
				}
			: null,
		manageUrl: owns ? `/manage/${token}` : null
	};
};
