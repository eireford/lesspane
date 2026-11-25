import { json } from '@sveltejs/kit';
import { agents, pricing, business } from '#lib/config.ts';
import { PACKAGES } from '#lib/layout.ts';
import { ChatLimits, clientIp } from './assistant/limits';
import {
	OrderError,
	businessInfo,
	cancelBooking,
	checkServiceArea,
	getBooking,
	quote,
	requestBooking,
	rescheduleBooking,
	type AgentContext
} from './orders';

// One description of what an outside AI agent can do, used three ways: as MCP tools (/mcp), as the HTTP API
// (/api/v1) and as its OpenAPI document (/openapi.json). See docs/agent-ordering-plan.md.

type Schema = Record<string, unknown>;

export type AgentTool = {
	name: string;
	title: string;
	description: string;
	inputSchema: Schema;
	/** MCP hints: does it change anything, and is repeating it harmless? */
	readOnly: boolean;
	idempotent: boolean;
	http: { method: 'GET' | 'POST'; path: string };
};

const token = { type: 'string', pattern: '^[A-Za-z0-9_-]{32}$', description: 'The booking_token request_booking returned.' };
const date = { type: 'string', format: 'date', description: 'Visit day, YYYY-MM-DD, 1 to 60 days ahead.' };
const window = { type: 'string', enum: ['morning', 'afternoon'], description: 'morning = 8am–12pm, afternoon = 12pm–5pm.' };
const weekday = {
	type: 'string',
	enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
	description: 'The weekday your person asked for. Send it: a preferred_date that falls on another day is refused, which catches date mistakes before anything is booked.'
};

export const agentTools: AgentTool[] = [
	{
		name: 'get_business_info',
		title: 'About LessPane',
		description:
			"What LessPane does, where (Maryland's Eastern Shore), services, extras, packages, policies, payment terms and how ordering works. Read it first.",
		inputSchema: { type: 'object', properties: {}, additionalProperties: false },
		readOnly: true,
		idempotent: true,
		http: { method: 'GET', path: '/business' }
	},
	{
		name: 'check_service_area',
		title: 'Check a ZIP code',
		description: 'Says whether LessPane serves a 5-digit US ZIP code.',
		inputSchema: {
			type: 'object',
			properties: { zip: { type: 'string', pattern: '^\\d{5}$', description: '5-digit ZIP code.' } },
			required: ['zip'],
			additionalProperties: false
		},
		readOnly: true,
		idempotent: true,
		http: { method: 'GET', path: '/service-area' }
	},
	{
		name: 'get_quote',
		title: 'Price a job',
		description:
			'Prices a window cleaning with LessPane’s own rates. Give a package, or windows and stories. Returns the price and a quote_id for request_booking. Never state a price you did not get from this tool.',
		inputSchema: {
			type: 'object',
			properties: {
				package: { type: 'string', enum: PACKAGES.map((p) => p.id), description: PACKAGES.map((p) => `${p.id}: ${p.name}, ${p.blurb}`).join('; ') },
				windows: { type: 'integer', minimum: 1, maximum: pricing.maxWindows, description: 'Number of windows (if no package).' },
				stories: { type: 'integer', enum: [1, 2, 3], description: 'Floors of the home (if no package).' },
				service: {
					type: 'string',
					enum: ['exterior', 'interior_exterior'],
					default: 'exterior',
					description: 'exterior = outside only; interior_exterior = inside and outside.'
				},
				addons: {
					type: 'array',
					items: { type: 'string', enum: Object.keys(pricing.addOns) },
					description: Object.entries(pricing.addOns).map(([k, a]) => `${k}: ${a.label}`).join('; ')
				}
			},
			additionalProperties: false
		},
		readOnly: true,
		idempotent: true,
		http: { method: 'POST', path: '/quotes' }
	},
	{
		name: 'request_booking',
		title: 'Request a visit',
		description:
			'Asks LessPane for a visit for your person. Call only after they saw the price, day and time and clearly said yes. LessPane then emails them; nothing is booked until they confirm there. Returns a booking_token for get_booking, reschedule_booking and cancel_booking.',
		inputSchema: {
			type: 'object',
			properties: {
				quote_id: { type: 'string', description: 'From get_quote.' },
				preferred_date: date,
				preferred_weekday: weekday,
				preferred_window: window,
				email: { type: 'string', format: 'email', description: 'The customer’s email (required): they confirm from it.' },
				name: { type: 'string', maxLength: 80, description: 'The customer’s name, if they gave it.' },
				phone: { type: 'string', description: 'A phone number for texts, if they gave it.' },
				address: { type: 'string', maxLength: 200, description: 'Street address, if they gave it.' },
				zip: { type: 'string', pattern: '^\\d{5}$', description: '5-digit ZIP, if they gave it. Must be one LessPane serves.' },
				notes: { type: 'string', maxLength: 500, description: 'Anything the cleaner should know (gate code, pets). Stored as text, shown to the owner as written by you.' },
				agent: { type: 'string', maxLength: agents.maxAgentName, description: 'Which assistant you are and who runs it, e.g. "Claude, Anthropic".' },
				approved_by_customer: { type: 'boolean', const: true, description: 'true: your person saw this price, day and time and said yes.' },
				request_id: {
					type: 'string',
					pattern: '^[A-Za-z0-9_.:-]{8,200}$',
					description: 'A unique id you make up, so a retry (same request_id and same quote_id, within a day) returns the same booking instead of a second one. (HTTP: the Idempotency-Key header.)'
				}
			},
			required: ['quote_id', 'preferred_date', 'preferred_window', 'email', 'agent', 'approved_by_customer'],
			additionalProperties: false
		},
		readOnly: false,
		idempotent: true,
		http: { method: 'POST', path: '/bookings' }
	},
	{
		name: 'get_booking',
		title: 'Check a booking',
		description: 'The booking’s status (awaiting_customer, new, confirmed, done or cancelled), day, time and price.',
		inputSchema: { type: 'object', properties: { booking_token: token }, required: ['booking_token'], additionalProperties: false },
		readOnly: true,
		idempotent: true,
		http: { method: 'GET', path: '/bookings/{booking_token}' }
	},
	{
		name: 'reschedule_booking',
		title: 'Change the day',
		description: 'Moves an open booking to another day or time window, until the day before the visit. LessPane re-confirms the new time.',
		inputSchema: {
			type: 'object',
			properties: { booking_token: token, preferred_date: date, preferred_weekday: weekday, preferred_window: window },
			required: ['booking_token', 'preferred_date', 'preferred_window'],
			additionalProperties: false
		},
		readOnly: false,
		idempotent: true,
		http: { method: 'POST', path: '/bookings/{booking_token}/reschedule' }
	},
	{
		name: 'cancel_booking',
		title: 'Cancel a booking',
		description: 'Cancels an open booking, free, until the day before the visit. Ask your person first.',
		inputSchema: { type: 'object', properties: { booking_token: token }, required: ['booking_token'], additionalProperties: false },
		readOnly: false,
		idempotent: true,
		http: { method: 'POST', path: '/bookings/{booking_token}/cancel' }
	}
];

/** Runs one operation. Throws OrderError for anything the agent should fix or explain. */
export async function runAgentTool(name: string, args: Record<string, unknown>, ctx: AgentContext): Promise<Record<string, unknown>> {
	const t = typeof args.booking_token === 'string' ? args.booking_token : '';
	switch (name) {
		case 'get_business_info':
			return businessInfo(ctx.origin);
		case 'check_service_area':
			return checkServiceArea(args.zip);
		case 'get_quote':
			return quote(args);
		case 'request_booking':
			return requestBooking(args, ctx);
		case 'get_booking':
			return getBooking(t, ctx.origin);
		case 'reschedule_booking':
			return rescheduleBooking(t, args, ctx.origin);
		case 'cancel_booking':
			return cancelBooking(t, ctx.origin);
		default:
			throw new OrderError(404, 'unknown_operation', `There is no ${name} operation.`);
	}
}

/** The API and MCP share one per-IP limit. Counts live in memory, per instance, like the chat's. */
export const agentLimits = new ChatLimits(agents.requestsPerMinute, Number.POSITIVE_INFINITY);

export const allowAgentRequest = (request: Request, getClientAddress: () => string) =>
	agentLimits.allowRequest(clientIp(request, getClientAddress));

/** An OrderError as the JSON body agents get: `{error: {code, message, ...details}}`. */
export const errorBody = (e: OrderError) => ({ error: { code: e.code, message: e.message, ...e.details } });

export const tooMany = () =>
	json(
		{ error: { code: 'rate_limited', message: 'Too many requests. Wait a minute and try again.' } },
		{ status: 429, headers: { 'Retry-After': '60' } }
	);

/** The instructions an MCP client shows its model when it connects. */
export const agentInstructions = () =>
	[
		`LessPane cleans home windows on Maryland's Eastern Shore. Prices start at $${pricing.minimum}; nothing is paid up front.`,
		'1. check_service_area for the ZIP. 2. get_quote, and never state a price you did not get from it.',
		'3. Show your person the price, day and time window; book only after they clearly say yes.',
		'4. request_booking with the quote_id, the day (and preferred_weekday, which catches date mistakes), their email and agent (your name).',
		'5. Repeat the day to your person as day_text gives it, and tell them to confirm from the email LessPane sends, or nothing is booked.',
		...(business.showcase.enabled ? ['LessPane is currently a demo: bookings are not real and nobody will come to clean. Say so.'] : [])
	].join('\n');
