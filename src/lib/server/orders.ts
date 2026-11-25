import { randomUUID } from 'node:crypto';
import {
	agents,
	business,
	policies,
	pricing,
	serviceAreaZips,
	serviceLabels,
	timeWindowLabels,
	type AddOnKey,
	type ServiceType,
	type Stories
} from '#lib/config.ts';
import { PACKAGES, totalWindows } from '#lib/layout.ts';
import { computeQuote, formatUsd } from '#lib/pricing.ts';
import { parseContact, parseHomeDetails, parseJob, parseWhen, todayIso, type FieldErrors } from '#lib/validation.ts';
import { derivedManageToken, sign, verify } from './agent-secrets';
import { syncEvent } from './calendar';
import { notifyAgentRequest, notifyCustomerChange, notifyOwnerOfRequest } from './email';
import {
	getRequestByConfirmToken,
	listRequestsByIdempotencyKey,
	getRequestByManageToken,
	hashToken,
	listRequestsByEmail,
	newToken,
	saveRequest,
	updateRequest,
	type QuoteRequest
} from './store';

// Ordering for outside AI agents (docs/agent-ordering-plan.md), shared by the HTTP API (/api/v1), the MCP server
// (/mcp), the customer's confirm page (/confirm/<token>) and the manage page (/manage/<token>). Every price comes
// from computeQuote and every input goes through the website's own validators. An agent's request waits for the
// customer to confirm it from their email before the owner ever sees it.

/** A refusal with an HTTP status, a stable code an agent can act on, and a sentence it can repeat. */
export class OrderError extends Error {
	constructor(
		readonly status: number,
		readonly code: string,
		message: string,
		readonly details?: Record<string, unknown>
	) {
		super(message);
	}
}

type Input = Record<string, unknown>;
const text = (v: unknown) => (v === undefined || v === null ? '' : String(v).trim());
const demo = () =>
	business.showcase.enabled
		? { demo: true, demo_notice: 'LessPane is a demo: bookings are not real and nobody will come to clean.' }
		: { demo: false };

/** API field names for the validators' errors (the website's forms use camelCase). */
const FIELD_NAMES: Record<string, string> = { preferredDate: 'preferred_date', preferredWindow: 'preferred_window' };
const invalid = (errors: FieldErrors) =>
	new OrderError(400, 'invalid_input', 'Some details need fixing: see `fields`.', {
		fields: Object.fromEntries(Object.entries(errors).map(([k, v]) => [FIELD_NAMES[k] ?? k, v]))
	});

// ---------- About the business ----------

export function businessInfo(origin: string) {
	return {
		name: business.name,
		what: 'Home window cleaning, outside only or inside and outside, with optional extras.',
		where: "Maryland's Eastern Shore: Caroline, Cecil, Dorchester, Kent, Queen Anne's, Somerset, Talbot, Wicomico and Worcester counties.",
		service_area_zips: [...serviceAreaZips].sort(),
		services: Object.entries(serviceLabels).map(([id, label]) => ({ id, label })),
		extras: Object.entries(pricing.addOns).map(([id, a]) => ({ id, label: a.label, price: a.price, per: a.per })),
		packages: PACKAGES.map((p) => {
			const windows = totalWindows(p.layout);
			const total = computeQuote({ windows, stories: p.layout.floors, service: 'exterior', addons: [] }).total;
			return { id: p.id, name: p.name, description: p.blurb, stories: p.layout.floors, windows, outside_only_price: total };
		}),
		minimum_price: pricing.minimum,
		time_windows: Object.entries(timeWindowLabels).map(([id, label]) => ({ id, label })),
		booking_days_ahead: business.bookingWindowDays,
		how_ordering_works: [
			'Get a price with get_quote (POST /api/v1/quotes). Never state a price you did not get from it.',
			'Show your person the price, day and time window, and book only after they clearly say yes.',
			'request_booking (POST /api/v1/bookings) sends them an email; nothing is booked until they confirm it there.',
			`Unconfirmed requests lapse after ${agents.confirmHours} hours. After the customer confirms, LessPane confirms the exact time, usually within one business day.`
		],
		policies: {
			hours: policies.hours,
			confirmation: policies.confirmation,
			payment: policies.payment,
			changes: policies.changes,
			weather: policies.weather,
			guarantee: policies.guarantee,
			home_access: policies.homeAccess,
			not_offered: policies.notOffered
		},
		contact_email: business.contactEmail,
		docs: `${origin}/agents`,
		...demo()
	};
}

export function checkServiceArea(zipInput: unknown) {
	const zip = text(zipInput);
	if (!/^\d{5}$/.test(zip)) throw new OrderError(400, 'invalid_input', 'Send a 5-digit ZIP code.', { fields: { zip: 'Not a 5-digit ZIP code.' } });
	const served = serviceAreaZips.has(zip);
	return { zip, served, message: served ? 'LessPane serves this ZIP code.' : "LessPane doesn't serve this ZIP code.", ...demo() };
}

// ---------- Quotes ----------

/** What a quote id carries: the job, its price and when it lapses. Signed, so it can't be edited. */
type QuotePayload = { w: number; s: Stories; sv: ServiceType; a: AddOnKey[]; p: number; e: number };

function readJob(input: Input) {
	const pkg = text(input.package);
	const params = new URLSearchParams();
	if (pkg) {
		const p = PACKAGES.find((x) => x.id === pkg);
		if (!p) throw new OrderError(400, 'invalid_input', `Unknown package. Use one of: ${PACKAGES.map((x) => x.id).join(', ')}.`, { fields: { package: 'Unknown package.' } });
		params.set('windows', String(totalWindows(p.layout)));
		params.set('stories', String(p.layout.floors));
	} else {
		params.set('windows', text(input.windows));
		params.set('stories', text(input.stories));
	}
	params.set('service', text(input.service) || 'exterior');
	const addons = input.addons === undefined ? [] : Array.isArray(input.addons) ? input.addons : [input.addons];
	for (const a of addons) params.append('addons', text(a));
	const job = parseJob(params);
	if (!job.ok) throw invalid(job.errors);
	return job.value;
}

export function quote(input: Input, now = Date.now()) {
	const job = readJob(input);
	const q = computeQuote(job);
	const expires = now + agents.quoteValidDays * 86_400_000;
	const payload: QuotePayload = { w: job.windows, s: job.stories, sv: job.service, a: job.addons, p: q.total, e: expires };
	return {
		quote_id: sign('quote', payload),
		total: q.total,
		total_text: formatUsd(q.total),
		lines: q.lines.map((l) => ({ label: l.label, amount: l.amount })),
		minimum_applied: q.minimumApplied,
		windows: job.windows,
		stories: job.stories,
		service: job.service,
		service_label: serviceLabels[job.service],
		addons: job.addons,
		valid_until: new Date(expires).toISOString(),
		note: 'The price assumes the home is as described. If it is quite different (many more windows), LessPane agrees any change with the customer before starting.',
		...demo()
	};
}

/** The job behind a quote id, re-priced now. Refuses a forged or lapsed id, and a price that has since changed. */
function redeem(quoteId: string, now: number) {
	const payload = verify<QuotePayload>('quote', quoteId);
	if (!payload) throw new OrderError(400, 'invalid_quote', 'That quote_id is not one LessPane issued. Get a new one with get_quote.');
	if (payload.e < now) throw new OrderError(410, 'quote_expired', 'That quote has expired. Get a new one with get_quote.');
	const job = { windows: payload.w, stories: payload.s, service: payload.sv, addons: payload.a };
	const total = computeQuote(job).total;
	if (total !== payload.p) {
		throw new OrderError(409, 'price_changed', `Prices have changed: this job is now ${formatUsd(total)}. Show your person the new price before booking.`, {
			new_quote: quote({ windows: job.windows, stories: job.stories, service: job.service, addons: job.addons }, now)
		});
	}
	return job;
}

// ---------- Bookings ----------

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/** "Tuesday, December 1" for a YYYY-MM-DD day. */
const dayText = (iso: string) =>
	new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });

/**
 * Agents get dates wrong ("next Tuesday" as a Wednesday: the evals caught one). When the agent says which weekday
 * its person asked for, a date that falls on another day is refused before anything is booked.
 */
function checkWeekday(input: Input) {
	const wanted = text(input.preferred_weekday).toLowerCase();
	const date = text(input.preferred_date);
	if (!wanted || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
	if (!WEEKDAYS.includes(wanted)) {
		throw new OrderError(400, 'invalid_input', 'preferred_weekday must be a day of the week, like "Tuesday".', { fields: { preferred_weekday: 'Not a weekday.' } });
	}
	const actual = WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
	if (actual !== wanted) {
		const cap = (d: string) => d[0].toUpperCase() + d.slice(1);
		throw new OrderError(400, 'weekday_mismatch', `${date} is a ${cap(actual)}, not a ${cap(wanted)}. Work out the date again, and check it with your person.`, {
			fields: { preferred_date: `${date} is a ${cap(actual)}.` }
		});
	}
}

const OPEN = new Set(['awaiting_customer', 'new', 'confirmed']);

const STATUS_TEXT: Record<QuoteRequest['status'], string> = {
	awaiting_customer: 'Waiting for the customer to confirm from the email LessPane sent them.',
	new: 'Requested. LessPane will confirm the exact time, usually within one business day.',
	confirmed: 'Confirmed by LessPane.',
	done: 'Done.',
	cancelled: 'Cancelled.'
};

const confirmDeadline = (r: QuoteRequest) => new Date(Date.parse(r.created_at) + agents.confirmHours * 3_600_000);

/** Lapses an agent's request the customer never confirmed. Returns the request as it now stands. */
export async function expireIfStale(r: QuoteRequest, now = new Date()): Promise<QuoteRequest> {
	if (r.status !== 'awaiting_customer' || confirmDeadline(r) > now) return r;
	const fields = { status: 'cancelled' as const, cancel_reason: 'expired' };
	await updateRequest(r.id, fields);
	return { ...r, ...fields };
}

/** A booking as an agent sees it. */
function view(r: QuoteRequest, origin: string, token: string) {
	return {
		booking_token: token,
		status: r.status,
		status_text:
			r.status === 'cancelled' && r.cancel_reason === 'expired'
				? 'Lapsed: the customer did not confirm it in time.'
				: r.status === 'cancelled' && r.cancel_reason === 'declined'
					? 'Cancelled: the customer said they did not ask for it.'
					: STATUS_TEXT[r.status],
		...(r.status === 'awaiting_customer' && { confirm_by: confirmDeadline(r).toISOString() }),
		preferred_date: r.preferred_date,
		day_text: dayText(r.preferred_date),
		preferred_window: r.preferred_window,
		time_text: timeWindowLabels[r.preferred_window],
		total: r.quoted_price,
		total_text: formatUsd(r.quoted_price),
		windows: r.window_count,
		stories: r.stories,
		service: r.service_type,
		addons: r.add_ons,
		manage_url: `${origin}/manage/${token}`,
		can_change: changeable(r),
		...demo()
	};
}

export type AgentContext = { origin: string; client: string };

/**
 * An agent asks for a visit for its customer. Saved as `awaiting_customer`; the customer gets an email to confirm it.
 * A repeated call with the same `request_id` returns the same booking instead of making a second one.
 */
export async function requestBooking(input: Input, ctx: AgentContext, now = new Date()) {
	const requestId = text(input.request_id);
	if (requestId && !/^[A-Za-z0-9_.:-]{8,200}$/.test(requestId)) {
		throw new OrderError(400, 'invalid_input', 'request_id must be 8 to 200 letters, digits or _ . : -', { fields: { request_id: 'Bad format.' } });
	}
	// A retry is the same request_id with the same quote_id within a day. The quote id is unguessable and only the
	// agent that asked for it has it, so nobody else can fetch a booking's link by guessing a model's readable key.
	const quoteHash = hashToken(text(input.quote_id));
	if (requestId) {
		const earlier = (await listRequestsByIdempotencyKey(requestId)).find(
			(r) => r.quote_hash === quoteHash && now.getTime() - Date.parse(r.created_at) < 86_400_000
		);
		if (earlier) {
			const same =
				earlier.email === text(input.email).toLowerCase() &&
				earlier.preferred_date === text(input.preferred_date) &&
				earlier.preferred_window === text(input.preferred_window);
			if (!same) throw new OrderError(422, 'request_id_reused', 'This request_id and quote_id were already used for a different booking. Use a new request_id.');
			return { ...view(await expireIfStale(earlier, now), ctx.origin, derivedManageToken(earlier.id)), repeated: true, next_step: nextStep(earlier) };
		}
	}

	if (input.approved_by_customer !== true) {
		throw new OrderError(400, 'not_approved', 'Show your person the price, day and time first, and send approved_by_customer: true only after they say yes.');
	}
	const agentName = text(input.agent);
	if (!agentName || agentName.length > agents.maxAgentName) {
		throw new OrderError(400, 'invalid_input', `Say which assistant you are in \`agent\` (up to ${agents.maxAgentName} characters), for example "Claude, Anthropic".`, {
			fields: { agent: 'Required.' }
		});
	}
	const job = redeem(text(input.quote_id), now.getTime());
	checkWeekday(input);

	const params = new URLSearchParams({
		windows: String(job.windows),
		stories: String(job.stories),
		service: job.service,
		address: text(input.address),
		zip: text(input.zip),
		preferredDate: text(input.preferred_date),
		preferredWindow: text(input.preferred_window),
		name: text(input.name),
		phone: text(input.phone),
		email: text(input.email),
		notes: text(input.notes)
	});
	for (const a of job.addons) params.append('addons', a);
	const home = parseHomeDetails(params);
	const contact = parseContact(params, now);
	if (!home.ok || !contact.ok) throw invalid({ ...(home.ok ? {} : home.errors), ...(contact.ok ? {} : contact.errors) });

	const mine = await listRequestsByEmail(contact.value.email);
	const open = (await Promise.all(mine.map((r) => expireIfStale(r, now)))).filter((r) => OPEN.has(r.status));
	if (open.length >= agents.openRequestsPerEmail) {
		throw new OrderError(429, 'too_many_open_requests', `This email already has ${open.length} open requests. Cancel one, or ask the customer to email ${business.contactEmail}.`);
	}

	const id = randomUUID();
	const manageToken = derivedManageToken(id);
	const confirmToken = newToken();
	const { record } = await saveRequest(
		{
			address: home.value.address,
			zip: home.value.zip,
			stories: home.value.stories,
			window_count: home.value.windows,
			service_type: home.value.service,
			add_ons: home.value.addons,
			quoted_price: computeQuote(home.value).total,
			preferred_date: contact.value.preferredDate,
			preferred_window: contact.value.preferredWindow,
			name: contact.value.name,
			phone: contact.value.phone,
			email: contact.value.email,
			notes: contact.value.notes,
			status: 'awaiting_customer',
			source: 'agent',
			agent_name: agentName,
			agent_client: ctx.client.slice(0, 200),
			confirm_hash: hashToken(confirmToken),
			quote_hash: quoteHash,
			...(requestId && { idempotency_key: requestId })
		},
		{ id, manageToken }
	);
	await notifyAgentRequest(record, ctx.origin, confirmToken, manageToken);
	return { ...view(record, ctx.origin, manageToken), repeated: false, next_step: nextStep(record) };
}

function nextStep(r: QuoteRequest) {
	return r.status === 'awaiting_customer'
		? `Tell your person: LessPane emailed ${r.email}; they must tap Confirm in that email within ${agents.confirmHours} hours, or the request lapses. Nothing is booked until then.`
		: STATUS_TEXT[r.status];
}

async function byToken(token: string, now: Date) {
	const r = await getRequestByManageToken(token);
	if (!r) throw new OrderError(404, 'not_found', 'No booking matches that token.');
	return expireIfStale(r, now);
}

/** Open, and its day hasn't come yet: the same rule as the manage page. */
export const changeable = (r: QuoteRequest, now = new Date()) => OPEN.has(r.status) && r.preferred_date > todayIso(undefined, now);

export async function getBooking(token: string, origin: string, now = new Date()) {
	const r = await byToken(token, now);
	return { ...view(r, origin, token), next_step: nextStep(r) };
}

/** A new day or time. Agent requests not yet confirmed stay waiting; others go back to `new` for the owner. */
export async function rescheduleBooking(token: string, input: Input, origin: string, now = new Date()) {
	const r = await byToken(token, now);
	if (!changeable(r, now)) throw new OrderError(409, 'not_changeable', `This booking can't be changed online any more. Email ${business.contactEmail}.`);
	checkWeekday(input);
	const when = parseWhen(new URLSearchParams({ preferredDate: text(input.preferred_date), preferredWindow: text(input.preferred_window) }), now);
	if (!when.ok) throw invalid(when.errors);
	const waiting = r.status === 'awaiting_customer';
	const fields = {
		preferred_date: when.value.preferredDate,
		preferred_window: when.value.preferredWindow,
		status: waiting ? ('awaiting_customer' as const) : ('new' as const)
	};
	const next = { ...r, ...fields };
	await updateRequest(r.id, fields);
	await notifyCustomerChange(next, origin, 'rescheduled', { tellOwner: !waiting });
	if (!waiting) await keepCalendar(next, origin);
	return { ...view(next, origin, token), next_step: nextStep(next) };
}

export async function cancelBooking(token: string, origin: string, now = new Date()) {
	const r = await byToken(token, now);
	if (!changeable(r, now)) throw new OrderError(409, 'not_changeable', `This booking can't be changed online any more. Email ${business.contactEmail}.`);
	const next = { ...r, status: 'cancelled' as const };
	await updateRequest(r.id, { status: 'cancelled' });
	await notifyCustomerChange(next, origin, 'cancelled', { tellOwner: r.status !== 'awaiting_customer' });
	await keepCalendar(next, origin);
	return { ...view(next, origin, token), next_step: 'Cancelled. Nothing more to do.' };
}

async function keepCalendar(r: QuoteRequest, origin: string) {
	const eventId = await syncEvent(r, origin);
	if (eventId !== (r.calendar_event_id || null)) await updateRequest(r.id, { calendar_event_id: eventId ?? '' });
}

// ---------- The customer's answer to an agent's request ----------

export async function findForConfirmation(token: string, now = new Date()) {
	const r = await getRequestByConfirmToken(token);
	return r ? expireIfStale(r, now) : null;
}

/** The customer says yes: the request becomes `new`, and the owner gets the alert and a tentative event. */
export async function confirmByCustomer(token: string, origin: string, now = new Date()) {
	const r = await findForConfirmation(token, now);
	if (!r) return null;
	if (r.status !== 'awaiting_customer') return r;
	const next = { ...r, status: 'new' as const };
	await updateRequest(r.id, { status: 'new' });
	await notifyOwnerOfRequest(next, origin);
	await keepCalendar(next, origin);
	return next;
}

/** The customer says it wasn't them: cancelled, and marked so the owner can see it. */
export async function declineByCustomer(token: string, now = new Date()) {
	const r = await findForConfirmation(token, now);
	if (!r) return null;
	if (r.status !== 'awaiting_customer') return r;
	const fields = { status: 'cancelled' as const, cancel_reason: 'declined' };
	await updateRequest(r.id, fields);
	console.warn(`[agents] customer declined a request from agent "${r.agent_name}" (${r.agent_client})`);
	return { ...r, ...fields };
}

/** For the admin list: lapses stale agent requests before showing them. */
export const expireAll = (rows: QuoteRequest[], now = new Date()) => Promise.all(rows.map((r) => expireIfStale(r, now)));

