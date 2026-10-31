import { describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {} }));

const { rawEmail } = await import('./mime');
const { makeSession, readSession, isAllowedAdmin } = await import('./session');
const { eventBody } = await import('./calendar');

const decode = (raw: string) => Buffer.from(raw, 'base64url').toString('utf8');

describe('rawEmail', () => {
	it('builds a UTF-8 plain-text message Gmail accepts', () => {
		const msg = decode(rawEmail({ from: 'LessPane <hello@lesspane.com>', to: 'a@b.co', subject: 'Front 3–4', text: 'Hi – there', replyTo: 'c@d.co' }));
		expect(msg).toContain('From: LessPane <hello@lesspane.com>');
		expect(msg).toContain('Reply-To: c@d.co');
		expect(msg).toMatch(/Subject: =\?UTF-8\?B\?.+\?=/);
		const body = msg.split('\r\n\r\n')[1].replace(/\r\n/g, '');
		expect(Buffer.from(body, 'base64').toString('utf8')).toBe('Hi – there');
	});
});

describe('admin session', () => {
	const secret = 'test-secret';
	it('round-trips and rejects tampering or expiry', () => {
		const now = Date.UTC(2026, 0, 1);
		const cookie = makeSession('eire@wedocompute.com', secret, now);
		expect(readSession(cookie, secret, now + 1000)).toBe('eire@wedocompute.com');
		expect(readSession(cookie, 'other-secret', now)).toBeNull();
		expect(readSession(cookie.replace(/^./, 'x'), secret, now)).toBeNull();
		expect(readSession(cookie, secret, now + 13 * 3600_000)).toBeNull();
	});
	it('only allows listed addresses, case-insensitively', () => {
		expect(isAllowedAdmin('Eire@WeDoCompute.com', 'eire@wedocompute.com, ops@wedocompute.com')).toBe(true);
		expect(isAllowedAdmin('someone@gmail.com', 'eire@wedocompute.com')).toBe(false);
		expect(isAllowedAdmin('eire@wedocompute.com', undefined)).toBe(false);
	});
});

describe('calendar event', () => {
	it('blocks out the visit window in Eastern time and marks unconfirmed requests tentative', () => {
		const e = eventBody(
			{
				id: 'r1', created_at: '', address: '12 Goldsborough St', zip: '21601', stories: 2, window_count: 24,
				service_type: 'exterior', add_ons: ['screens'], quoted_price: 195, preferred_date: '2026-11-04',
				preferred_window: 'afternoon', name: 'Avery Brooks', phone: '4105550100', email: 'a@b.co', notes: '', status: 'new'
			},
			'https://lesspane.com'
		);
		expect(e.start).toEqual({ dateTime: '2026-11-04T12:00:00', timeZone: 'America/New_York' });
		expect(e.end.dateTime).toBe('2026-11-04T17:00:00');
		expect(e.status).toBe('tentative');
		expect(e.summary).toBe('LessPane: Avery Brooks · $195');
		expect(e.description).toContain('https://lesspane.com/admin');
	});
});
