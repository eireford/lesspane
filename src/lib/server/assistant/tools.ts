import { business, pricing, serviceAreaZips, serviceLabels, timeWindowLabels, type AddOnKey } from '#lib/config.ts';
import { computeQuote, formatUsd } from '#lib/pricing.ts';
import { notifyNewRequest } from '#lib/server/email.ts';
import { syncEvent } from '#lib/server/calendar.ts';
import { saveRequest, updateRequest } from '#lib/server/store.ts';
import { parseContact, parseHomeDetails, parseJob } from '#lib/validation.ts';

// The assistant's tools. Each one goes through the same validation and pricing as the website's own forms,
// so the model can never set a price or save something the booking page would reject.

const addOnKeys = Object.keys(pricing.addOns) as AddOnKey[];

const jobProperties = {
	windows: { type: 'integer', minimum: 1, maximum: pricing.maxWindows, description: 'Number of windows to clean.' },
	stories: { type: 'integer', enum: [1, 2, 3], description: 'Floors of the home (1, 2 or 3).' },
	service: {
		type: 'string',
		enum: ['exterior', 'interior_exterior'],
		description: '"exterior" = outside only; "interior_exterior" = inside and outside.'
	},
	addons: {
		type: 'array',
		items: { type: 'string', enum: addOnKeys },
		description: 'Extras: screens (screen cleaning), tracks (track and sill cleaning), hard_water (hard-water stain removal).'
	}
};

export const toolDeclarations = [
	{
		name: 'estimate_price',
		description: 'Prices a window cleaning job with LessPane\'s rates. Use it for every price you give.',
		parametersJsonSchema: {
			type: 'object',
			properties: jobProperties,
			required: ['windows', 'stories', 'service']
		}
	},
	{
		name: 'check_zip',
		description: 'Says whether LessPane serves a 5-digit ZIP code.',
		parametersJsonSchema: {
			type: 'object',
			properties: { zip: { type: 'string', description: '5-digit US ZIP code.' } },
			required: ['zip']
		}
	},
	{
		name: 'book_appointment',
		description:
			'Saves a booking request and emails the customer a confirmation with a private link to manage it. Call only after the customer has seen the summary and clearly said yes.',
		parametersJsonSchema: {
			type: 'object',
			properties: {
				...jobProperties,
				preferred_date: { type: 'string', description: 'Day of the visit, YYYY-MM-DD.' },
				preferred_window: { type: 'string', enum: ['morning', 'afternoon'] },
				email: { type: 'string', description: 'Customer email (required).' },
				name: { type: 'string', description: 'Customer name, if given.' },
				phone: { type: 'string', description: 'Phone number for texts, if given.' },
				address: { type: 'string', description: 'Street address, if given.' },
				zip: { type: 'string', description: '5-digit ZIP, if given.' },
				notes: { type: 'string', description: 'Anything the cleaner should know (gate code, pets, hard-to-reach windows).' }
			},
			required: ['windows', 'stories', 'service', 'preferred_date', 'preferred_window', 'email']
		}
	}
];

type Args = Record<string, unknown>;
export type ToolContext = { origin: string; booked: boolean };

const text = (v: unknown) => (v === undefined || v === null ? '' : String(v));

/** The job's fields as the website's forms send them, for the shared validators. */
function jobParams(args: Args): URLSearchParams {
	const p = new URLSearchParams({ windows: text(args.windows), stories: text(args.stories), service: text(args.service) });
	for (const a of Array.isArray(args.addons) ? args.addons : []) p.append('addons', text(a));
	return p;
}

function estimate(args: Args) {
	const job = parseJob(jobParams(args));
	if (!job.ok) return { ok: false, errors: job.errors };
	const quote = computeQuote(job.value);
	return {
		ok: true,
		total: quote.total,
		total_text: formatUsd(quote.total),
		service: serviceLabels[job.value.service],
		lines: quote.lines.map((l) => `${l.label}: ${formatUsd(l.amount)}`),
		minimum_applied: quote.minimumApplied
	};
}

function checkZip(args: Args) {
	const zip = text(args.zip).trim();
	if (!/^\d{5}$/.test(zip)) return { ok: false, error: 'Not a 5-digit ZIP code.' };
	return { ok: true, zip, served: serviceAreaZips.has(zip) };
}

async function book(args: Args, ctx: ToolContext) {
	if (ctx.booked) return { ok: false, error: 'Already booked once in this reply. Ask the customer before booking again.' };

	const userNotes = text(args.notes).trim();
	const params = jobParams(args);
	for (const [key, arg] of [
		['address', 'address'],
		['zip', 'zip'],
		['preferredDate', 'preferred_date'],
		['preferredWindow', 'preferred_window'],
		['name', 'name'],
		['phone', 'phone'],
		['email', 'email']
	]) {
		params.set(key, text(args[arg]).trim());
	}
	params.set('notes', ['Booked through the chat assistant.', userNotes].filter(Boolean).join(' '));

	const home = parseHomeDetails(params);
	const contact = parseContact(params);
	if (!home.ok || !contact.ok) {
		return { ok: false, errors: { ...(home.ok ? {} : home.errors), ...(contact.ok ? {} : contact.errors) } };
	}

	// Recomputed here, exactly as the booking page does.
	const quote = computeQuote(home.value);
	const { record, manageToken } = await saveRequest({
		address: home.value.address,
		zip: home.value.zip,
		stories: home.value.stories,
		window_count: home.value.windows,
		service_type: home.value.service,
		add_ons: home.value.addons,
		quoted_price: quote.total,
		preferred_date: contact.value.preferredDate,
		preferred_window: contact.value.preferredWindow,
		name: contact.value.name,
		phone: contact.value.phone,
		email: contact.value.email,
		notes: contact.value.notes,
		source: 'chat'
	});
	ctx.booked = true;

	await notifyNewRequest(record, ctx.origin, manageToken);
	const eventId = await syncEvent(record, ctx.origin);
	if (eventId) await updateRequest(record.id, { calendar_event_id: eventId });

	return {
		ok: true,
		total_text: formatUsd(record.quoted_price),
		date: record.preferred_date,
		time: timeWindowLabels[record.preferred_window],
		email: record.email,
		manage_url: `${ctx.origin}/manage/${manageToken}`,
		demo: business.showcase.enabled
	};
}

/** Runs one tool call; unknown tools and bad arguments come back as errors the model can explain. */
export async function runTool(name: string | undefined, args: Args = {}, ctx: ToolContext): Promise<Record<string, unknown>> {
	switch (name) {
		case 'estimate_price':
			return estimate(args);
		case 'check_zip':
			return checkZip(args);
		case 'book_appointment':
			return book(args, ctx);
		default:
			return { ok: false, error: `Unknown tool ${name}.` };
	}
}
