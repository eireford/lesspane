import { describe, expect, it } from 'vitest';
import { computeQuote } from '#lib/pricing.ts';
import { sampleRequests } from './demo';
import { changeEmails, customerConfirmation, ownerAlert } from './messages';

describe('owner view samples', () => {
	const now = new Date('2026-11-24T15:00:00Z');
	const requests = sampleRequests(now);

	it('are priced by the real pricing code', () => {
		for (const r of requests) {
			const quote = computeQuote({ windows: r.window_count, stories: r.stories, service: r.service_type, addons: r.add_ons });
			expect(r.quoted_price).toBe(quote.total);
		}
	});

	it('are newest first, with visit days counted from today', () => {
		const times = requests.map((r) => r.created_at);
		expect([...times].sort().reverse()).toEqual(times);
		expect(requests.map((r) => r.preferred_date)).toContain('2026-11-27');
	});

	it('use only fictional contact details', () => {
		for (const r of requests) {
			expect(r.email).toMatch(/@example\.com$/);
			if (r.phone) expect(r.phone).toMatch(/^\(410\) 555-01\d\d$/);
		}
	});

	it('cover every status the owner can set', () => {
		expect(new Set(requests.map((r) => r.status))).toEqual(new Set(['new', 'confirmed', 'done', 'cancelled']));
	});
});

describe('email messages', () => {
	const [r] = sampleRequests(new Date('2026-11-24T15:00:00Z'));

	it('give the customer their manage link and the owner a reply-to the customer', () => {
		expect(customerConfirmation(r, 'https://lesspane.com', 'tok').text).toContain('https://lesspane.com/manage/tok');
		const alert = ownerAlert(r, 'https://lesspane.com', 'owner@example.com');
		expect(alert).toMatchObject({ to: 'owner@example.com', replyTo: r.email });
		expect(alert.subject).toBe(`New request: $${r.quoted_price} on ${r.preferred_date}`);
	});

	it('tell the owner about a change only when there is an owner address', () => {
		expect(changeEmails(r, 'https://lesspane.com', 'cancelled')).toHaveLength(1);
		const [, owner] = changeEmails(r, 'https://lesspane.com', 'rescheduled', 'owner@example.com');
		expect(owner.subject).toMatch(/^Rescheduled by customer: /);
	});
});
