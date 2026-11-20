import { assistant } from '#lib/config.ts';

// Usage limits for the chat assistant, so a script can't run up the Gemini bill (see ../docs/conventions.md in
// the job-search hub). Counts live in memory, per Cloud Run instance; a restart only ever loosens them.

/**
 * The visitor's IP address. Cloud Run's front end appends the address it saw to X-Forwarded-For, so the last
 * entry is the real one; anything before it came from the visitor and can be made up.
 */
export function clientIp(request: Request, fallback: () => string): string {
	const forwarded = request.headers.get('x-forwarded-for') ?? '';
	const entries = forwarded.split(',').map((e) => e.trim()).filter(Boolean);
	if (entries.length) return entries[entries.length - 1];
	try {
		return fallback();
	} catch {
		return 'unknown';
	}
}

export class ChatLimits {
	private minute = -1;
	private minuteCounts = new Map<string, number>();
	private day = '';
	private dayCount = 0;

	constructor(
		readonly perMinute: number,
		readonly perDay: number
	) {}

	/** Counts one request from this address; false once it has made more than `perMinute` this minute. */
	allowRequest(ip: string, now = Date.now()): boolean {
		const minute = Math.floor(now / 60_000);
		if (minute !== this.minute) {
			// A new minute: forget the last one, so the table never holds more than one minute of addresses.
			this.minute = minute;
			this.minuteCounts = new Map();
		}
		const count = (this.minuteCounts.get(ip) ?? 0) + 1;
		this.minuteCounts.set(ip, count);
		return count <= this.perMinute;
	}

	/** Counts one call to Gemini; false once this instance has made `perDay` today (UTC). */
	allowModelCall(now = Date.now()): boolean {
		const day = new Date(now).toISOString().slice(0, 10);
		if (day !== this.day) {
			this.day = day;
			this.dayCount = 0;
		}
		if (this.dayCount >= this.perDay) return false;
		this.dayCount++;
		return true;
	}
}

/** The one set of counters the chat endpoint uses. */
export const chatLimits = new ChatLimits(assistant.requestsPerMinute, assistant.dailyModelCalls);
