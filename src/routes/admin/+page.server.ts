import { fail } from '@sveltejs/kit';
import { syncEvent } from '#lib/server/calendar.ts';
import { expireAll } from '#lib/server/orders.ts';
import { getRequest, listRequests, requestStatuses, setRequestStatus, updateRequest } from '#lib/server/store.ts';
import type { Actions, PageServerLoad } from './$types';

type OwnerStatus = (typeof requestStatuses)[number];

// Owner-only list of requests. Access is enforced in hooks.server.ts (HTTP Basic auth or Google sign-in).
export const load: PageServerLoad = async ({ setHeaders, locals }) => {
	setHeaders({ 'cache-control': 'no-store' });
	// Agent requests the customer never confirmed lapse here too, not only when someone opens their link.
	return { requests: await expireAll(await listRequests()), statuses: requestStatuses, admin: locals.admin ?? null };
};

export const actions: Actions = {
	status: async ({ request, url }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const status = String(form.get('status') ?? '') as OwnerStatus;
		if (!id || !requestStatuses.includes(status)) return fail(400, { message: 'Invalid update.' });
		await setRequestStatus(id, status);
		// Keep the calendar in step: confirmed shows as confirmed, cancelled removes the event.
		const r = await getRequest(id);
		if (r) {
			const eventId = await syncEvent(r, url.origin);
			if (eventId !== (r.calendar_event_id || null)) await updateRequest(id, { calendar_event_id: eventId ?? "" /* Firestore rejects undefined */ });
		}
		return { updated: id };
	},
	/** The owner phoned the customer about an AI agent's request (docs/agent-ordering-plan.md, section 4). */
	checked: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const r = id ? await getRequest(id) : null;
		if (!r || r.source !== 'agent') return fail(400, { message: 'Invalid update.' });
		await updateRequest(id, { phone_checked_at: form.get('checked') === 'on' ? new Date().toISOString() : '' });
		return { updated: id };
	}
};
