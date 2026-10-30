import { fail, redirect } from '@sveltejs/kit';
import { computeQuote } from '$lib/pricing';
import { notifyNewRequest } from '$lib/server/email';
import { saveRequest } from '$lib/server/store';
import {
	bookingDateRange,
	homeToSearchParams,
	parseContact,
	parseHomeDetails
} from '$lib/validation';
import type { Actions, PageServerLoad } from './$types';

// Screen 4: "Time & contact".
export const load: PageServerLoad = ({ url }) => {
	const result = parseHomeDetails(url.searchParams);
	if (!result.ok) {
		const back = new URLSearchParams(url.searchParams);
		back.set('err', '1');
		redirect(303, `/quote?${back}`);
	}

	const details = result.value;
	return {
		details,
		quote: computeQuote(details),
		query: homeToSearchParams(details).toString(),
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
		if (!home.ok) {
			return fail(400, {
				message: 'Something about your home details changed. Please go back and get a new quote.'
			});
		}

		const contact = parseContact(form);
		if (!contact.ok) {
			return fail(400, { errors: contact.errors, values: contact.raw });
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
