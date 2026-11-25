import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuoteRequest } from './store';

// The ordering rules for outside AI agents, with an in-memory store and the email and calendar calls captured.

vi.mock('$app/env/private', () => ({ SESSION_SECRET: 'test-secret' }));

const rows: QuoteRequest[] = [];
vi.mock('./store', async () => {
	const { createHash, randomBytes, randomUUID } = await import('node:crypto');
	const hash = (t: string) => createHash('sha256').update(t).digest('hex');
	return {
		hashToken: hash,
		newToken: () => randomBytes(24).toString('base64url'),
		saveRequest: async (input: Record<string, unknown>, opts: { manageToken?: string; id?: string } = {}) => {
			const manageToken = opts.manageToken ?? randomBytes(24).toString('base64url');
			const record = { ...input, id: opts.id ?? randomUUID(), created_at: new Date().toISOString(), status: input.status ?? 'new', manage_hash: hash(manageToken) };
			rows.push(record as QuoteRequest);
			return { record, manageToken };
		},
		updateRequest: async (id: string, fields: Partial<QuoteRequest>) => {
			Object.assign(rows.find((r) => r.id === id)!, fields);
		},
		getRequestByManageToken: async (t: string) => rows.find((r) => r.manage_hash === hash(t)) ?? null,
		getRequestByConfirmToken: async (t: string) => rows.find((r) => r.confirm_hash === hash(t)) ?? null,
		listRequestsByIdempotencyKey: async (k: string) => rows.filter((r) => r.idempotency_key === k),
		listRequestsByEmail: async (e: string) => rows.filter((r) => r.email === e)
	};
});

const sent = { agentRequest: [] as { confirmToken: string; manageToken: string }[], owner: [] as string[], change: [] as { change: string; tellOwner: boolean }[] };
vi.mock('./email', () => ({
	notifyAgentRequest: async (_r: QuoteRequest, _o: string, confirmToken: string, manageToken: string) => {
		sent.agentRequest.push({ confirmToken, manageToken });
	},
	notifyOwnerOfRequest: async (r: QuoteRequest) => {
		sent.owner.push(r.id);
	},
	notifyCustomerChange: async (_r: QuoteRequest, _o: string, change: string, opts: { tellOwner?: boolean } = {}) => {
		sent.change.push({ change, tellOwner: opts.tellOwner ?? true });
	}
}));
const synced: string[] = [];
vi.mock('./calendar', () => ({
	syncEvent: async (r: QuoteRequest) => {
		synced.push(`${r.id}:${r.status}`);
		return null;
	}
}));

const orders = await import('./orders');
const { sign } = await import('./agent-secrets');
const { computeQuote } = await import('#lib/pricing.ts');
const { addDaysIso, todayIso } = await import('#lib/validation.ts');

const ctx = { origin: 'https://lesspane.test', client: 'test-agent/1.0' };
const day = addDaysIso(todayIso(), 5);
const booking = (extra: Record<string, unknown> = {}) => ({
	quote_id: orders.quote({ package: 'family' }).quote_id,
	preferred_date: day,
	preferred_window: 'morning',
	email: 'pat@example.com',
	zip: '21601',
	agent: 'Claude, Anthropic',
	approved_by_customer: true,
	...extra
});
const refusal = async (p: Promise<unknown>) => {
	try {
		await p;
	} catch (e) {
		if (e instanceof orders.OrderError) return { status: e.status, code: e.code, details: e.details };
		throw e;
	}
	throw new Error('expected a refusal');
};

beforeEach(() => {
	rows.length = 0;
	sent.agentRequest.length = sent.owner.length = sent.change.length = 0;
	synced.length = 0;
});

describe('quotes', () => {
	it('price a package with the site’s own pricing', () => {
		const q = orders.quote({ package: 'family' });
		expect(q.total).toBe(computeQuote({ windows: 24, stories: 2, service: 'exterior', addons: [] }).total);
		expect(q.quote_id).toMatch(/^[\w-]+\.[\w-]+$/);
	});

	it('refuse bad input with field errors', async () => {
		expect(await refusal(Promise.resolve().then(() => orders.quote({ windows: 0, stories: 2 })))).toMatchObject({ status: 400, code: 'invalid_input' });
		expect(await refusal(Promise.resolve().then(() => orders.quote({ package: 'castle' })))).toMatchObject({ status: 400 });
	});

	it('cannot be edited, replayed after expiry, or used at an old price', async () => {
		const [body, sig] = orders.quote({ package: 'family' }).quote_id.split('.');
		const edited = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url').toString()), p: 1 })).toString('base64url');
		expect(await refusal(orders.requestBooking(booking({ quote_id: `${edited}.${sig}` }), ctx))).toMatchObject({ code: 'invalid_quote' });

		const expired = sign('quote', { w: 24, s: 2, sv: 'exterior', a: [], p: 210, e: Date.now() - 1 });
		expect(await refusal(orders.requestBooking(booking({ quote_id: expired }), ctx))).toMatchObject({ status: 410, code: 'quote_expired' });

		const oldPrice = sign('quote', { w: 24, s: 2, sv: 'exterior', a: [], p: 99, e: Date.now() + 60_000 });
		const r = await refusal(orders.requestBooking(booking({ quote_id: oldPrice }), ctx));
		expect(r).toMatchObject({ status: 409, code: 'price_changed' });
		expect((r.details?.new_quote as { total: number }).total).toBe(210);
	});
});

describe('an agent’s booking request', () => {
	it('needs the person’s approval and the agent’s name', async () => {
		expect(await refusal(orders.requestBooking(booking({ approved_by_customer: false }), ctx))).toMatchObject({ code: 'not_approved' });
		expect(await refusal(orders.requestBooking(booking({ agent: '' }), ctx))).toMatchObject({ code: 'invalid_input' });
		expect(rows).toHaveLength(0);
	});

	it('uses the website’s validation', async () => {
		const r = await refusal(orders.requestBooking(booking({ zip: '21201', preferred_date: '2020-01-01', email: 'nope' }), ctx));
		expect(Object.keys((r.details?.fields as object) ?? {}).sort()).toEqual(['email', 'preferred_date', 'zip']);
	});

	it('waits for the customer, off the calendar, and emails them a confirm link the agent never sees', async () => {
		const res = await orders.requestBooking(booking(), ctx);
		expect(res).toMatchObject({ status: 'awaiting_customer', total: 210, repeated: false, demo: true });
		expect(rows[0]).toMatchObject({ source: 'agent', agent_name: 'Claude, Anthropic', agent_client: 'test-agent/1.0', quoted_price: 210 });
		expect(sent.agentRequest).toHaveLength(1);
		expect(sent.agentRequest[0].manageToken).toBe(res.booking_token);
		expect(JSON.stringify(res)).not.toContain(sent.agentRequest[0].confirmToken);
		expect(synced).toEqual([]);
		expect(sent.owner).toEqual([]);
	});

	it('refuses a date on another weekday than the person asked for, and spells out the day', async () => {
		const weekday = new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long' });
		const other = weekday === 'Monday' ? 'Tuesday' : 'Monday';
		const r = await refusal(orders.requestBooking(booking({ preferred_weekday: other }), ctx));
		expect(r).toMatchObject({ status: 400, code: 'weekday_mismatch' });
		expect(rows).toHaveLength(0);
		const ok = await orders.requestBooking(booking({ preferred_weekday: weekday }), ctx);
		expect(ok.day_text.startsWith(`${weekday}, `)).toBe(true);
	});

	it('returns the same booking for a retry: same request_id and same quote_id', async () => {
		const args = booking({ request_id: 'req-12345678' });
		const a = await orders.requestBooking(args, ctx);
		const b = await orders.requestBooking(args, ctx);
		expect(b).toMatchObject({ booking_token: a.booking_token, repeated: true });
		expect(rows).toHaveLength(1);
		expect(await refusal(orders.requestBooking({ ...args, email: 'sam@example.com' }, ctx))).toMatchObject({ status: 422, code: 'request_id_reused' });
	});

	it('never hands out a booking to someone who only guessed its request_id', async () => {
		// Models make up readable keys ("booking_20261201_easton_cottage_1"), so two requests can share one.
		const a = await orders.requestBooking(booking({ request_id: 'booking_20261201_easton_cottage_1' }), ctx);
		const b = await orders.requestBooking(booking({ request_id: 'booking_20261201_easton_cottage_1', quote_id: orders.quote({ package: 'cottage' }).quote_id }), ctx);
		expect(b.repeated).toBe(false);
		expect(b.booking_token).not.toBe(a.booking_token);
		expect(rows).toHaveLength(2);
	});

	it('caps open requests per email', async () => {
		for (let i = 0; i < 3; i++) await orders.requestBooking(booking(), ctx);
		expect(await refusal(orders.requestBooking(booking(), ctx))).toMatchObject({ status: 429, code: 'too_many_open_requests' });
	});
});

describe('the customer’s answer', () => {
	it('confirming makes it a new request for the owner, with an alert and a calendar event', async () => {
		const res = await orders.requestBooking(booking(), ctx);
		const r = await orders.confirmByCustomer(sent.agentRequest[0].confirmToken, ctx.origin);
		expect(r?.status).toBe('new');
		expect(sent.owner).toEqual([rows[0].id]);
		expect(synced).toEqual([`${rows[0].id}:new`]);
		expect((await orders.getBooking(res.booking_token, ctx.origin)).status).toBe('new');
		// A second click changes nothing.
		await orders.confirmByCustomer(sent.agentRequest[0].confirmToken, ctx.origin);
		expect(sent.owner).toHaveLength(1);
	});

	it('declining cancels it without bothering the owner', async () => {
		await orders.requestBooking(booking(), ctx);
		const r = await orders.declineByCustomer(sent.agentRequest[0].confirmToken);
		expect(r).toMatchObject({ status: 'cancelled', cancel_reason: 'declined' });
		expect(sent.owner).toEqual([]);
	});

	it('no answer in time and it lapses', async () => {
		const res = await orders.requestBooking(booking(), ctx);
		const later = new Date(Date.now() + 49 * 3600_000);
		expect(await orders.confirmByCustomer(sent.agentRequest[0].confirmToken, ctx.origin, later)).toMatchObject({ status: 'cancelled', cancel_reason: 'expired' });
		expect((await orders.getBooking(res.booking_token, ctx.origin, later)).status_text).toMatch(/Lapsed/);
		expect(sent.owner).toEqual([]);
	});

	it('a wrong confirm link matches nothing', async () => {
		expect(await orders.confirmByCustomer('x'.repeat(32), ctx.origin)).toBeNull();
	});
});

describe('changes by the agent', () => {
	it('moving a request still awaiting the customer keeps it waiting and leaves the owner alone', async () => {
		const res = await orders.requestBooking(booking(), ctx);
		const moved = await orders.rescheduleBooking(res.booking_token, { preferred_date: addDaysIso(day, 1), preferred_window: 'afternoon' }, ctx.origin);
		expect(moved).toMatchObject({ status: 'awaiting_customer', preferred_window: 'afternoon' });
		expect(sent.change).toEqual([{ change: 'rescheduled', tellOwner: false }]);
		expect(synced).toEqual([]);
	});

	it('cancelling a confirmed request tells the owner and clears the calendar', async () => {
		const res = await orders.requestBooking(booking(), ctx);
		await orders.confirmByCustomer(sent.agentRequest[0].confirmToken, ctx.origin);
		const c = await orders.cancelBooking(res.booking_token, ctx.origin);
		expect(c.status).toBe('cancelled');
		expect(sent.change.at(-1)).toEqual({ change: 'cancelled', tellOwner: true });
		expect(synced.at(-1)).toBe(`${rows[0].id}:cancelled`);
		expect(await refusal(orders.cancelBooking(res.booking_token, ctx.origin))).toMatchObject({ status: 409, code: 'not_changeable' });
	});

	it('an unknown token is not found', async () => {
		expect(await refusal(orders.getBooking('y'.repeat(32), ctx.origin))).toMatchObject({ status: 404 });
	});
});

// ---------- The endpoints agents call ----------

const mcp = await import('../../routes/mcp/+server.ts');
const api = await import('../../routes/api/v1/[...path]/+server.ts');
const openapi = await import('../../routes/openapi.json/+server.ts');

type Handler = (event: never) => Promise<Response> | Response;
let ip = 0;
const call = (handler: Handler, url: string, init: RequestInit = {}, params: Record<string, string> = {}) => {
	const request = new Request(url, init);
	return handler({ request, url: new URL(url), params, getClientAddress: () => `203.0.113.${++ip % 250}` } as never);
};
const rpc = async (body: object) =>
	call(mcp.POST as Handler, 'https://lesspane.test/mcp', {
		method: 'POST',
		headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
		body: JSON.stringify({ jsonrpc: '2.0', ...body })
	});

describe('the MCP server', () => {
	it('initializes, lists the tools and answers ping', async () => {
		const init = await (await rpc({ id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } })).json();
		expect(init.result).toMatchObject({ protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'lesspane' } });
		expect(init.result.instructions).toContain('get_quote');
		expect((await rpc({ method: 'notifications/initialized' })).status).toBe(202);
		const list = await (await rpc({ id: 2, method: 'tools/list' })).json();
		expect(list.result.tools.map((t: { name: string }) => t.name)).toEqual([
			'get_business_info',
			'check_service_area',
			'get_quote',
			'request_booking',
			'get_booking',
			'reschedule_booking',
			'cancel_booking'
		]);
		expect((await (await rpc({ id: 3, method: 'ping' })).json()).result).toEqual({});
	});

	it('runs a tool, and returns a refusal as a tool error the model can read', async () => {
		const ok = await (await rpc({ id: 4, method: 'tools/call', params: { name: 'get_quote', arguments: { package: 'cottage' } } })).json();
		expect(ok.result.isError).toBe(false);
		expect(ok.result.structuredContent.total).toBe(120);
		const bad = await (await rpc({ id: 5, method: 'tools/call', params: { name: 'request_booking', arguments: { agent: 'x' } } })).json();
		expect(bad.result.isError).toBe(true);
		expect(bad.result.structuredContent.error.code).toBe('not_approved');
	});

	it('rejects what it does not speak', async () => {
		expect((await (await rpc({ id: 6, method: 'resources/list' })).json()).error.code).toBe(-32601);
		expect((await (await rpc({ id: 7, method: 'tools/call', params: { name: 'nope' } })).json()).error.code).toBe(-32602);
		expect((await call(mcp.GET as Handler, 'https://lesspane.test/mcp')).status).toBe(405);
	});
});

describe('the HTTP API', () => {
	const post = (path: string, body: object, headers: Record<string, string> = {}) =>
		call(api.POST as Handler, `https://lesspane.test/api/v1/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }, { path });

	it('quotes, books with an Idempotency-Key, and reads the booking back', async () => {
		const q = await (await post('quotes', { package: 'family' })).json();
		const first = await post('bookings', { ...booking(), quote_id: q.quote_id }, { 'idempotency-key': 'key-abcdefgh' });
		expect(first.status).toBe(201);
		const again = await post('bookings', { ...booking(), quote_id: q.quote_id }, { 'idempotency-key': 'key-abcdefgh' });
		expect(again.status).toBe(200);
		const { booking_token } = await first.json();
		const got = await call(api.GET as Handler, `https://lesspane.test/api/v1/bookings/${booking_token}`, {}, { path: `bookings/${booking_token}` });
		expect((await got.json()).status).toBe('awaiting_customer');
		expect(rows).toHaveLength(1);
	});

	it('answers refusals with 4xx and an error code, never 200', async () => {
		const r = await post('bookings', { ...booking(), approved_by_customer: false });
		expect(r.status).toBe(400);
		expect((await r.json()).error.code).toBe('not_approved');
		const area = await call(api.GET as Handler, 'https://lesspane.test/api/v1/service-area?zip=21201', {}, { path: 'service-area' });
		expect(await area.json()).toMatchObject({ served: false });
		expect((await post('nowhere', {})).status).toBe(404);
	});

	it('is described by an OpenAPI document with one operation per tool', async () => {
		const doc = await (await call(openapi.GET as Handler, 'https://lesspane.test/openapi.json')).json();
		const ops = Object.values(doc.paths as Record<string, Record<string, { operationId: string }>>).flatMap((p) => Object.values(p).map((o) => o.operationId));
		expect(ops.sort()).toEqual(['cancel_booking', 'check_service_area', 'get_booking', 'get_business_info', 'get_quote', 'request_booking', 'reschedule_booking']);
	});
});
