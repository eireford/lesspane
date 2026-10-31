import { fail, redirect } from '@sveltejs/kit';
import { computeQuote } from '$lib/pricing';
import { notifyNewRequest } from '$lib/server/email';
import { saveRequest } from '$lib/server/store';
import { describeLayout, layoutToSearchParams, parseLayout, totalWindows, type Layout } from '$lib/layout';
import { bookingDateRange, parseContact, parseHomeDetails, parseJob } from '$lib/validation';
import type { Actions, PageServerLoad } from './$types';

/**
 * The job as the quote steps built it: the layout (floors, sides, window buckets) plus service and add-ons.
 * The window count always comes from the layout, never from a number the browser sends.
 */
function jobParams(src: URLSearchParams | FormData, layout: Layout): URLSearchParams {
	const p = new URLSearchParams();
	for (const [k, v] of src.entries()) if (typeof v === 'string') p.append(k, v);
	p.set('stories', String(layout.floors));
	p.set('windows', String(totalWindows(layout)));
	p.set('notes', `Windows by side: ${describeLayout(layout)}`);
	return p;
}

// Second screen: the quote steps built the job (carried in the query string); here the customer picks a
// day and time and says who and where. Scheduling stays off the first page on purpose.
export const load: PageServerLoad = ({ url }) => {
	const layout = parseLayout(url.searchParams);
	const job = layout ? parseJob(jobParams(url.searchParams, layout)) : null;
	if (!layout || !job?.ok) redirect(303, '/');
	const back = layoutToSearchParams(layout);
	back.set('service', job.value.service);
	for (const a of job.value.addons) back.append('addons', a);
	return {
		layout,
		job: job.value,
		quote: computeQuote(job.value),
		summary: describeLayout(layout),
		back: `/quote?${back}`,
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

		const layout = parseLayout(form);
		const params = layout ? jobParams(form, layout) : new URLSearchParams();
		const home = parseHomeDetails(params);
		const contact = parseContact(params);
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
