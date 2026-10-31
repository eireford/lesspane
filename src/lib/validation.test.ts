import { describe, expect, it } from 'vitest';
import { addDaysIso, jobToSearchParams, parseContact, parseHomeDetails, parseJob, todayIso } from './validation';

const home = (overrides: Record<string, string | string[]> = {}) => {
	const base: Record<string, string | string[]> = {
		address: '123 Main St, Easton, MD',
		zip: '21601',
		stories: '2',
		windows: '18',
		service: 'exterior',
		addons: ['screens'],
		...overrides
	};
	const p = new URLSearchParams();
	for (const [k, v] of Object.entries(base)) {
		for (const item of Array.isArray(v) ? v : [v]) p.append(k, item);
	}
	return p;
};

describe('parseHomeDetails', () => {
	it('accepts valid details', () => {
		const r = parseHomeDetails(home());
		expect(r.ok).toBe(true);
	});

	it('rejects ZIPs outside the service area', () => {
		const r = parseHomeDetails(home({ zip: '10001' }));
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.errors.zip).toMatch(/serve/);
	});

	it('rejects unknown add-ons and bad window counts', () => {
		const r = parseHomeDetails(home({ addons: ['gold_plating'], windows: '0' }));
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.errors.addons).toBeDefined();
			expect(r.errors.windows).toBeDefined();
		}
	});
});

describe('parseContact', () => {
	const now = new Date('2026-11-02T18:00:00Z');
	const tomorrow = addDaysIso(todayIso('America/New_York', now), 1);

	const contact = (overrides: Record<string, string> = {}) =>
		new URLSearchParams({
			preferredDate: tomorrow,
			preferredWindow: 'morning',
			name: 'Pat Doe',
			phone: '(360) 555-0101',
			email: 'Pat@Example.com',
			notes: '',
			...overrides
		});

	it('accepts valid contact details and lowercases email', () => {
		const r = parseContact(contact(), now);
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.value.email).toBe('pat@example.com');
	});

	it('rejects past dates', () => {
		const r = parseContact(contact({ preferredDate: '2026-01-01' }), now);
		expect(r.ok).toBe(false);
	});
});

describe('parseJob', () => {
	it('prices a job without an address, and round-trips through the query string', () => {
		const job = parseJob(new URLSearchParams('stories=3&windows=12&service=exterior&addons=tracks'));
		expect(job.ok).toBe(true);
		if (!job.ok) return;
		const again = parseJob(jobToSearchParams(job.value, 'victorian'));
		expect(again.ok && again.value).toEqual(job.value);
		expect(jobToSearchParams(job.value, 'victorian').get('house')).toBe('victorian');
	});

	it('rejects a job with no windows', () => {
		const job = parseJob(new URLSearchParams('stories=2&windows=0&service=exterior'));
		expect(job.ok).toBe(false);
	});
});
