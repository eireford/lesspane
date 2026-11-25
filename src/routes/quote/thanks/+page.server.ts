import { eventBody } from '#lib/calendar-event.ts';
import { business } from '#lib/config.ts';
import { firstName } from '#lib/contact.ts';
import { ownerAlert } from '#lib/server/messages.ts';
import { getRequest, getRequestByManageToken } from '#lib/server/store.ts';
import type { PageServerLoad } from './$types';

// Screen 5: "Confirmation". Shows only a non-sensitive summary of the request, plus the "manage your booking"
// link when the request's own secret came along (straight after booking; the same link is in the email).
// In the demo, the person who just booked also sees what the owner got: the alert email and the calendar
// event, built by the same code. That holds their contact details, so it needs the request's own secret too.
export const load: PageServerLoad = async ({ url, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	const id = url.searchParams.get('id') ?? '';
	const token = url.searchParams.get('t') ?? '';
	const record = /^[0-9a-f-]{36}$/i.test(id) ? await getRequest(id) : null;
	const owns = record && token ? (await getRequestByManageToken(token))?.id === record.id : false;

	const owner =
		record && owns && business.showcase.enabled
			? (() => {
					const alert = ownerAlert(record, url.origin, 'the owner');
					const event = eventBody(record, url.origin);
					return {
						alert: { subject: alert.subject, text: alert.text, replyTo: alert.replyTo },
						event: { summary: event.summary, location: event.location ?? '', status: event.status }
					};
				})()
			: null;

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
		manageUrl: owns ? `/manage/${token}` : null,
		owner
	};
};
