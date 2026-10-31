import { fail, redirect } from '@sveltejs/kit';
import { computeQuote } from '$lib/pricing';
import { notifyNewRequest } from '$lib/server/email';
import { saveRequest } from '$lib/server/store';
import { houses } from '$lib/sketches';
import { bookingDateRange, jobToSearchParams, parseContact, parseHomeDetails, parseJob } from '$lib/validation';
import type { Actions, PageServerLoad } from './$types';

// Second screen: the quote page's controls built the job (carried in the query string); here the customer
// picks a day and time and says who and where. Scheduling stays off the first page on purpose.
export const load: PageServerLoad = ({ url }) => {
	const job = parseJob(url.searchParams);
	if (!job.ok) redirect(303, '/');
	const house = houses.find((h) => h.id === url.searchParams.get('house')) ?? houses[0];
	return {
		job: job.value,
		house: house.id,
		quote: computeQuote(job.value),
		back: `/?${jobToSearchParams(job.value, house.id)}`,
		dateRange: bookingDateRange()
	};
};

export const actions: Actions = {
	default: async ({ request, url }) => {
		const form = await request.formData();

		// Bots fill every field; people never see this one.
		if (String(form.get('company') ?? '') !== '') {
			redirect(303, '/quote/thanks');
		}

		const home = parseHomeDetails(form);
		const contact = parseContact(form);
		if (!home.ok || !contact.ok) {
			const errors = { ...(home.ok ? {} : home.errors), ...(contact.ok ? {} : contact.errors) };
			// The quote page sets stories, windows, service and add-ons; only address and ZIP are typed here.
			const sceneProblem = ['stories', 'windows', 'service', 'addons'].some((k) => k in errors);
			return fail(400, {
				errors,
				values: Object.fromEntries(
					['address', 'zip', 'preferredDate', 'preferredWindow', 'name', 'phone', 'email', 'notes'].map(
						(k) => [k, String(form.get(k) ?? '')]
					)
				),
				message: sceneProblem ? 'Something about the job changed. Go back and check your choices.' : undefined
			});
		}

		// Recompute: never trust a price sent from the browser.
		const quote = computeQuote(home.value);

		const record = await saveRequest({
			address: home.value.address,
			zip: home.value.zip,
			stories: home.value.stories,
			window_count: home.value.windows,
			service_type: home.value.service,
			add_ons: home.value.addons,
			quoted_price: quote.total,
			preferred_date: contact.value.preferredDate,
			preferred_window: contact.value.preferredWindow,
			name: contact.value.name,
			phone: contact.value.phone,
			email: contact.value.email,
			notes: contact.value.notes
		});

		await notifyNewRequest(record, url.origin);

		redirect(303, `/quote/thanks?id=${record.id}`);
	}
};
