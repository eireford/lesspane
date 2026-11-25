import { error } from '@sveltejs/kit';
import { business } from '#lib/config.ts';
import { sampleRequests } from '#lib/server/demo.ts';
import { changeEmails, customerConfirmation, ownerAlert, type Email } from '#lib/server/messages.ts';
import { requestStatuses } from '#lib/server/store.ts';
import type { PageServerLoad } from './$types';

// The owner's side, for demo visitors: the request list, the calendar and the emails, built from made-up
// sample requests by the same code the real /admin page, calendar sync and emails use. Nothing here reads or
// writes the store, and nothing is sent. Only in showcase mode: a live business has no use for it.
const OWNER = 'owner@example.com';

export type InboxEmail = Email & { at: string; from: string };

export const load: PageServerLoad = async ({ url }) => {
	if (!business.showcase.enabled) error(404, 'Not found');
	const requests = sampleRequests();
	const origin = url.origin;

	// The owner's inbox: an alert for every request still waiting, and a reschedule made from a customer's link.
	const inbox: InboxEmail[] = requests
		.filter((r) => r.status === 'new')
		.map((r) => ({ ...ownerAlert(r, origin, OWNER), at: r.created_at, from: 'LessPane' }));
	const moved = requests.find((r) => r.status === 'confirmed' && r.name);
	if (moved) {
		const at = new Date(Date.parse(moved.created_at) + 3 * 3600_000).toISOString();
		const owner = changeEmails({ ...moved, status: 'new' }, origin, 'rescheduled', OWNER)[1];
		inbox.push({ ...owner, at, from: 'LessPane' });
	}
	inbox.sort((a, b) => b.at.localeCompare(a.at));

	// What the newest customer got, with a stand-in for their private link.
	const newest = requests.find((r) => r.name) ?? requests[0];
	const customer = customerConfirmation(newest, origin, 'sample-link-not-real');

	return { requests, statuses: requestStatuses, origin, inbox, customer: { ...customer, at: newest.created_at } };
};
