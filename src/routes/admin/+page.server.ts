import { fail } from '@sveltejs/kit';
import { syncEvent } from '$lib/server/calendar';
import { getRequest, listRequests, requestStatuses, setRequestStatus, updateRequest, type RequestStatus } from '$lib/server/store';
import type { Actions, PageServerLoad } from './$types';

// Owner-only list of requests. Access is enforced in hooks.server.ts (HTTP Basic auth).
export const load: PageServerLoad = async ({ setHeaders, locals }) => {
	setHeaders({ 'cache-control': 'no-store' });
	return { requests: await listRequests(), statuses: requestStatuses, admin: locals.admin ?? null };
};

export const actions: Actions = {
	status: async ({ request, url }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const status = String(form.get('status') ?? '') as RequestStatus;
		if (!id || !requestStatuses.includes(status)) return fail(400, { message: 'Invalid update.' });
		await setRequestStatus(id, status);
		// Keep the calendar in step: confirmed shows as confirmed, cancelled removes the event.
		const r = await getRequest(id);
		if (r) {
			const eventId = await syncEvent(r, url.origin);
			if (eventId !== (r.calendar_event_id || null)) await updateRequest(id, { calendar_event_id: eventId ?? "" /* Firestore rejects undefined */ });
		}
		return { updated: id };
	}
};
