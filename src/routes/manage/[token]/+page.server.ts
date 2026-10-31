import { error, fail } from '@sveltejs/kit';
import { getRequestByManageToken, updateRequest, type QuoteRequest } from '$lib/server/store';
import { notifyCustomerChange } from '$lib/server/email';
import { bookingDateRange, parseWhen, todayIso } from '$lib/validation';
import type { Actions, PageServerLoad } from './$types';

// "Manage your booking": no account, just the private link from the confirmation email. The customer can see
// their request and, until the visit day, pick a new day and time or cancel. The owner is emailed either way.

/** Changes are allowed for open requests whose day hasn't come yet. */
const changeable = (r: QuoteRequest) =>
	(r.status === 'new' || r.status === 'confirmed') && r.preferred_date > todayIso();

async function find(token: string) {
	const record = await getRequestByManageToken(token);
	if (!record) error(404, 'This link doesn’t match a booking. Check the link in your email, or start a new request.');
	return record;
}

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' });
	const r = await find(params.token);
	return {
		booking: {
			firstName: r.name.split(' ')[0],
			address: `${r.address} ${r.zip}`,
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
		const r = await find(params.token);
		if (!changeable(r)) return fail(409, { message: 'This booking can’t be changed online any more. Reply to your email and we’ll help.' });
		const when = parseWhen(await request.formData());
		if (!when.ok) return fail(400, { message: Object.values(when.errors).join(' ') });
		const fields = { preferred_date: when.value.preferredDate, preferred_window: when.value.preferredWindow, status: 'new' as const };
		await updateRequest(r.id, fields);
		await notifyCustomerChange({ ...r, ...fields }, url.origin, 'rescheduled');
		return { done: 'rescheduled' as const };
	},
	cancel: async ({ params, url }) => {
		const r = await find(params.token);
		if (!changeable(r)) return fail(409, { message: 'This booking can’t be changed online any more. Reply to your email and we’ll help.' });
		await updateRequest(r.id, { status: 'cancelled' });
		await notifyCustomerChange({ ...r, status: 'cancelled' }, url.origin, 'cancelled');
		return { done: 'cancelled' as const };
	}
};
