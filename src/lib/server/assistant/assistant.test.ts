import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Content } from '@google/genai';

vi.mock('$app/env/private', () => ({}));

const saved: Record<string, unknown>[] = [];
vi.mock('../store.ts', () => ({
	saveRequest: vi.fn(async (input: Record<string, unknown>) => {
		saved.push(input);
		return { record: { ...input, id: 'id-1', created_at: '', status: 'new' }, manageToken: 'T'.repeat(32) };
	}),
	updateRequest: vi.fn(async () => {})
}));
vi.mock('../email.ts', () => ({ notifyNewRequest: vi.fn(async () => {}) }));
vi.mock('../calendar.ts', () => ({ syncEvent: vi.fn(async () => null) }));

const { answer, AssistantError } = await import('./chat.ts');
const { runTool } = await import('./tools.ts');
const { ChatLimits, clientIp } = await import('./limits.ts');
const { systemInstruction } = await import('./knowledge.ts');
const { computeQuote } = await import('#lib/pricing.ts');

const ctx = () => ({ origin: 'https://lesspane.test', booked: false });
// 2026-11-19 is a Thursday; bookable days run from tomorrow to 60 days out.
const NOW = new Date('2026-11-19T15:00:00Z');

beforeEach(() => {
	saved.length = 0;
	vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
});

describe('estimate_price', () => {
	it('prices exactly as the quote screens do', async () => {
		const out = await runTool('estimate_price', { windows: 24, stories: 2, service: 'interior_exterior', addons: ['screens'] }, ctx());
		const expected = computeQuote({ windows: 24, stories: 2, service: 'interior_exterior', addons: ['screens'] });
		expect(out).toMatchObject({ ok: true, total: expected.total });
	});

	it('rejects a job the website would reject', async () => {
		const out = await runTool('estimate_price', { windows: 0, stories: 4, service: 'roof' }, ctx());
		expect(out.ok).toBe(false);
		expect(Object.keys(out.errors as object)).toEqual(expect.arrayContaining(['windows', 'stories', 'service']));
	});
});

describe('check_zip', () => {
	it('knows the service area', async () => {
		expect(await runTool('check_zip', { zip: '21801' }, ctx())).toMatchObject({ served: true });
		expect(await runTool('check_zip', { zip: '10001' }, ctx())).toMatchObject({ served: false });
		expect(await runTool('check_zip', { zip: 'abc' }, ctx())).toMatchObject({ ok: false });
	});
});

describe('book_appointment', () => {
	const booking = {
		windows: 20,
		stories: 2,
		service: 'exterior',
		preferred_date: '2026-11-24',
		preferred_window: 'morning',
		email: 'Pat@Example.com',
		notes: 'Gate code 1234'
	};

	it('saves with a server-computed price and returns the manage link', async () => {
		const out = await runTool('book_appointment', { ...booking, quoted_price: 1 }, ctx());
		expect(out).toMatchObject({ ok: true, manage_url: `https://lesspane.test/manage/${'T'.repeat(32)}` });
		expect(saved).toHaveLength(1);
		expect(saved[0]).toMatchObject({
			quoted_price: computeQuote({ windows: 20, stories: 2, service: 'exterior', addons: [] }).total,
			email: 'pat@example.com',
			notes: 'Booked through the chat assistant. Gate code 1234'
		});
	});

	it('refuses bad dates, unserved ZIPs and missing email without saving', async () => {
		const out = await runTool('book_appointment', { ...booking, preferred_date: '2026-11-19', zip: '10001', email: '' }, ctx());
		expect(out.ok).toBe(false);
		expect(Object.keys(out.errors as object)).toEqual(expect.arrayContaining(['preferredDate', 'zip', 'email']));
		expect(saved).toHaveLength(0);
	});

	it('books only once per reply', async () => {
		const c = ctx();
		await runTool('book_appointment', booking, c);
		expect(await runTool('book_appointment', booking, c)).toMatchObject({ ok: false });
		expect(saved).toHaveLength(1);
	});
});

describe('answer', () => {
	const allow = () => true;

	it('runs the tools the model asks for and returns its final text', async () => {
		const seen: Content[][] = [];
		const generate = vi.fn(async (contents: Content[]) => {
			seen.push(structuredClone(contents));
			if (seen.length === 1) {
				return { functionCalls: [{ id: 'c1', name: 'estimate_price', args: { windows: 12, stories: 1, service: 'exterior' } }] };
			}
			return { text: 'About **$150**.' };
		});
		const reply = await answer([{ role: 'user', text: 'Price for 12 windows?' }], { origin: 'x', allowModelCall: allow, generate });
		expect(reply).toBe('About **$150**.');
		const toolTurn = seen[1][2].parts?.[0].functionResponse;
		expect(toolTurn).toMatchObject({ id: 'c1', name: 'estimate_price', response: { ok: true } });
	});

	it('fails with AssistantError when the model errors, says nothing, or the daily limit is hit', async () => {
		const messages = [{ role: 'user' as const, text: 'Hi' }];
		await expect(
			answer(messages, { origin: 'x', allowModelCall: allow, generate: async () => Promise.reject(new Error('down')) })
		).rejects.toBeInstanceOf(AssistantError);
		await expect(answer(messages, { origin: 'x', allowModelCall: allow, generate: async () => ({ text: ' ' }) })).rejects.toBeInstanceOf(
			AssistantError
		);
		await expect(
			answer(messages, { origin: 'x', allowModelCall: () => false, generate: async () => ({ text: 'Hi' }) })
		).rejects.toMatchObject({ reason: 'daily_limit' });
	});

	it('stops a model that keeps calling tools', async () => {
		const generate = async () => ({ functionCalls: [{ name: 'check_zip', args: { zip: '21801' } }] });
		await expect(answer([{ role: 'user', text: 'Hi' }], { origin: 'x', allowModelCall: allow, generate })).rejects.toBeInstanceOf(
			AssistantError
		);
	});
});

describe('knowledge', () => {
	it('gives the model today, the bookable range and the real prices', () => {
		const text = systemInstruction(NOW);
		expect(text).toContain('Today is Thursday, November 19, 2026');
		expect(text).toContain('(2026-11-20) to');
		expect(text).toContain('$7');
		expect(text).toContain('DEMO MODE');
		expect(text).toContain('Times: Morning (8am–12pm) and Afternoon (12pm–5pm).');
		expect(text).not.toMatch(/\$\{|undefined|NaN/);
	});
});

describe('limits', () => {
	it('limits each address per minute and the instance per day', () => {
		const limits = new ChatLimits(2, 2);
		const t = Date.UTC(2026, 10, 19, 12, 0, 30);
		expect([1, 2, 3].map(() => limits.allowRequest('1.1.1.1', t))).toEqual([true, true, false]);
		expect(limits.allowRequest('2.2.2.2', t)).toBe(true);
		expect(limits.allowRequest('1.1.1.1', t + 60_000)).toBe(true);
		expect([1, 2, 3].map(() => limits.allowModelCall(t))).toEqual([true, true, false]);
		expect(limits.allowModelCall(t + 12 * 3600_000)).toBe(true);
	});

	it('trusts only the last X-Forwarded-For entry', () => {
		const req = (xff?: string) => new Request('https://x/', { headers: xff ? { 'x-forwarded-for': xff } : {} });
		expect(clientIp(req('10.0.0.1, 203.0.113.9'), () => 'socket')).toBe('203.0.113.9');
		expect(clientIp(req(), () => 'socket')).toBe('socket');
	});
});
