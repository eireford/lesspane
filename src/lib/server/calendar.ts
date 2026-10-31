import { env } from '$env/dynamic/private';
import { business, pricing, serviceLabels } from '$lib/config';
import { formatUsd } from '$lib/pricing';
import { googleFetch, SCOPES } from './google';
import type { QuoteRequest } from './store';

// Keeps one Google Calendar event per booking request on the owner's Workspace calendar: created on booking,
// moved when the customer reschedules, removed when it's cancelled. Configure with CALENDAR_USER (a Workspace
// user; defaults to GMAIL_USER) and CALENDAR_ID (defaults to that user's primary calendar). Unconfigured,
// or on any error, it logs and carries on: the calendar is a convenience, never a reason to lose a booking.

/** Visit windows in the business's time zone. */
const HOURS = { morning: ['08:00', '12:00'], afternoon: ['12:00', '17:00'] } as const;

export function eventBody(r: QuoteRequest, origin: string) {
	const [start, end] = HOURS[r.preferred_window];
	const extras = r.add_ons.map((a) => pricing.addOns[a].label).join(', ');
	return {
		summary: `${r.status === 'confirmed' ? '✓ ' : ''}LessPane: ${r.name} · ${formatUsd(r.quoted_price)}`,
		location: `${r.address} ${r.zip}`,
		description: [
			`${r.name} · ${r.phone} · ${r.email}`,
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

const user = () => env.CALENDAR_USER || env.GMAIL_USER;
const events = () =>
	`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.CALENDAR_ID || 'primary')}/events`;

/** Creates or updates the booking's event. Returns its event id (or the existing one, or null if not synced). */
export async function syncEvent(r: QuoteRequest, origin: string): Promise<string | null> {
	const who = user();
	if (!who) return r.calendar_event_id ?? null;
	try {
		if (r.status === 'cancelled') {
			await removeEvent(r);
			return null;
		}
		const body = JSON.stringify(eventBody(r, origin));
		if (r.calendar_event_id) {
			const res = await googleFetch(who, SCOPES.calendar, `${events()}/${r.calendar_event_id}`, { method: 'PATCH', body });
			if (res.ok) return r.calendar_event_id;
		}
		const res = await googleFetch(who, SCOPES.calendar, events(), { method: 'POST', body });
		return ((await res.json()) as { id: string }).id;
	} catch (err) {
		console.error('[calendar] sync failed', err);
		return r.calendar_event_id ?? null;
	}
}

export async function removeEvent(r: QuoteRequest): Promise<void> {
	const who = user();
	if (!who || !r.calendar_event_id) return;
	try {
		await googleFetch(who, SCOPES.calendar, `${events()}/${r.calendar_event_id}`, { method: 'DELETE' });
	} catch (err) {
		console.error('[calendar] remove failed', err);
	}
}
