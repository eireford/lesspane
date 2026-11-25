import * as env from '$app/env/private';
import { eventBody } from '#lib/calendar-event.ts';
import { googleFetch, SCOPES } from './google';
import type { QuoteRequest } from './store';

export { eventBody };

// Keeps one Google Calendar event per booking request on the owner's Workspace calendar: created on booking,
// moved when the customer reschedules, removed when it's cancelled. Configure with CALENDAR_USER (a Workspace
// user; defaults to GMAIL_USER) and CALENDAR_ID (defaults to that user's primary calendar). Unconfigured,
// or on any error, it logs and carries on: the calendar is a convenience, never a reason to lose a booking.

const user = () => env.CALENDAR_USER || env.GMAIL_USER;
const events = () =>
	`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.CALENDAR_ID || 'primary')}/events`;

/** Creates or updates the booking's event. Returns its event id (or the existing one, or null if not synced). */
export async function syncEvent(r: QuoteRequest, origin: string): Promise<string | null> {
	const who = user();
	if (!who) return r.calendar_event_id ?? null;
	try {
		// No event until there's a request the owner should plan for: awaiting customers take no slot.
		if (r.status === 'cancelled' || r.status === 'awaiting_customer') {
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
