import { fail, redirect } from '@sveltejs/kit';
import { computeQuote } from '$lib/pricing';
import { notifyNewRequest } from '$lib/server/email';
import { saveRequest } from '$lib/server/store';
import { bookingDateRange, parseContact, parseHomeDetails } from '$lib/validation';
import type { Actions, PageServerLoad } from './$types';

// The whole quote happens on this one screen: the house scene builds the job,
// and the booking form below it sends the request.
export const load: PageServerLoad = () => ({ dateRange: bookingDateRange() });

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
			// The scene controls stories, windows, service and add-ons; only address and ZIP are typed.
			const sceneProblem = ['stories', 'windows', 'service', 'addons'].some((k) => k in errors);
			return fail(400, {
				errors,
				values: Object.fromEntries(
					['address', 'zip', 'preferredDate', 'preferredWindow', 'name', 'phone', 'email', 'notes'].map(
						(k) => [k, String(form.get(k) ?? '')]
					)
				),
				message: sceneProblem ? 'Wipe at least one window on the house before booking.' : undefined
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
