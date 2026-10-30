import { fail } from '@sveltejs/kit';
import { listRequests, requestStatuses, setRequestStatus, type RequestStatus } from '$lib/server/store';
import type { Actions, PageServerLoad } from './$types';

// Owner-only list of requests. Access is enforced in hooks.server.ts (HTTP Basic auth).
export const load: PageServerLoad = async ({ setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	return { requests: await listRequests(), statuses: requestStatuses };
};

export const actions: Actions = {
	status: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const status = String(form.get('status') ?? '') as RequestStatus;
		if (!id || !requestStatuses.includes(status)) return fail(400, { message: 'Invalid update.' });
		await setRequestStatus(id, status);
		return { updated: id };
	}
};
