import { business, pricing, serviceLabels } from '#lib/config.ts';
import { contactLine, displayName, place } from '#lib/contact.ts';
import { formatUsd } from '#lib/pricing.ts';
import type { QuoteRequest } from '#lib/server/store.ts';

// What a booking looks like on the owner's Google Calendar. Shared by the calendar sync (server/calendar.ts)
// and the demo's owner view (/owner), which draws the same events from sample requests.

/** Visit windows in the business's time zone. */
export const HOURS = { morning: ['08:00', '12:00'], afternoon: ['12:00', '17:00'] } as const;

export function eventBody(r: QuoteRequest, origin: string) {
	const [start, end] = HOURS[r.preferred_window];
	const extras = r.add_ons.map((a) => pricing.addOns[a].label).join(', ');
	return {
		summary: `${r.status === 'confirmed' ? '✓ ' : ''}LessPane: ${displayName(r)} · ${formatUsd(r.quoted_price)}`,
		location: place(r) || undefined,
		description: [
			contactLine(r),
			`${r.stories}-story, about ${r.window_count} windows · ${serviceLabels[r.service_type]}${extras ? ` · ${extras}` : ''}`,
			`Estimate: ${formatUsd(r.quoted_price)} · Status: ${r.status}`,
			r.notes,
			`${origin}/admin`
		]
			.filter(Boolean)
			.join('\n'),
		start: { dateTime: `${r.preferred_date}T${start}:00`, timeZone: business.timeZone },
		end: { dateTime: `${r.preferred_date}T${end}:00`, timeZone: business.timeZone },
		// Requests not yet confirmed show as tentative.
		status: r.status === 'confirmed' ? 'confirmed' : 'tentative',
		extendedProperties: { private: { lesspaneRequestId: r.id } }
	};
}
