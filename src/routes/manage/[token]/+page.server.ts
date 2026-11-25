import { error, fail } from '@sveltejs/kit';
import { firstName, place } from '#lib/contact.ts';
import { OrderError, cancelBooking, changeable, expireIfStale, rescheduleBooking } from '#lib/server/orders.ts';
import { getRequestByManageToken } from '#lib/server/store.ts';
import { bookingDateRange } from '#lib/validation.ts';
import type { Actions, PageServerLoad } from './$types';

// "Manage your booking": no account, just the private link from the confirmation email. The customer can see
// their request and, until the visit day, pick a new day and time or cancel. The owner is emailed either way.

// The rules for changes live in orders.ts, shared with the agents' API: open requests whose day hasn't come.

async function find(token: string) {
	const record = await getRequestByManageToken(token);
	if (!record) error(404, 'This link doesn’t match a booking. Check the link in your email, or start a new request.');
	return expireIfStale(record);
}

/** Runs a change, turning a refusal into the form's message. */
async function change(run: () => Promise<unknown>) {
	try {
		await run();
	} catch (e) {
		if (e instanceof OrderError) return fail(e.status === 404 ? 404 : e.status, { message: e.message });
		throw e;
	}
}

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' });
	const r = await find(params.token);
	return {
		booking: {
			firstName: firstName(r),
			address: place(r),
			date: r.preferred_date,
			window: r.preferred_window,
			total: r.quoted_price,
			windows: r.window_count,
			stories: r.stories,
			service: r.service_type,
			addons: r.add_ons,
			status: r.status,
			layout: r.notes.startsWith('Windows by side: ') ? r.notes.slice('Windows by side: '.length) : ''
		},
		changeable: changeable(r),
		dateRange: bookingDateRange()
	};
};

export const actions: Actions = {
	reschedule: async ({ params, request, url }) => {
		const form = await request.formData();
		const input = { preferred_date: form.get('preferredDate'), preferred_window: form.get('preferredWindow') };
		return (await change(() => rescheduleBooking(params.token, input, url.origin))) ?? { done: 'rescheduled' as const };
	},
	cancel: async ({ params, url }) =>
		(await change(() => cancelBooking(params.token, url.origin))) ?? { done: 'cancelled' as const }
};
