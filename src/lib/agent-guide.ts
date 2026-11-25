import { agents, business, policies, pricing, serviceAreaZips, timeWindowLabels } from '#lib/config.ts';
import { PACKAGES, totalWindows } from '#lib/layout.ts';
import { computeQuote, formatUsd } from '#lib/pricing.ts';

// What an outside AI agent needs to order from LessPane, in one place: rendered as the /agents page and as
// /llms.txt, and the facts behind the home page's structured data. Every number comes from config.ts.

export const COUNTIES = ['Caroline', 'Cecil', 'Dorchester', 'Kent', "Queen Anne's", 'Somerset', 'Talbot', 'Wicomico', 'Worcester'];

export function agentGuide(origin: string) {
	return {
		title: `${business.name}: window cleaning on Maryland's Eastern Shore. Notes for AI agents`,
		intro: `${business.name} cleans home windows, outside only or inside and outside, in ${COUNTIES.join(', ')} counties, Maryland (${serviceAreaZips.size} ZIP codes). Prices start at ${formatUsd(pricing.minimum)}. You can order for the person you assist.`,
		demo: business.showcase.enabled ? `${business.name} is currently a demo. Bookings are not real and nobody will come to clean. Tell your person so.` : '',
		doors: [
			{ name: 'MCP', url: `${origin}/mcp`, note: 'Streamable HTTP, no sign-in. Tools: get_business_info, check_service_area, get_quote, request_booking, get_booking, reschedule_booking, cancel_booking.' },
			{ name: 'HTTP API', url: `${origin}/openapi.json`, note: 'JSON over HTTPS, the same operations, described in OpenAPI 3.1. Base URL /api/v1.' },
			{ name: 'Website', url: `${origin}/quote`, note: 'For browser agents: the same questions a person answers, every step reachable by tapping.' }
		],
		steps: [
			'Check the ZIP with check_service_area.',
			'Get a price with get_quote: a package (cottage, family, large) or the number of windows and floors, outside only or inside and outside, and any extras. Never state a price you did not get from it.',
			`Show your person the price, what is included, the day and the time window (${timeWindowLabels.morning} or ${timeWindowLabels.afternoon}), and ask them to approve. Do not book without a clear yes.`,
			'Call request_booking with the quote_id, the day and window, the weekday they asked for (preferred_weekday: a date on another day is refused), their email (required), any name, phone and address they gave, agent (which assistant you are) and approved_by_customer: true. Send a request_id so a retry cannot book twice.',
			`Tell your person: they must confirm from the email ${business.name} sends within ${agents.confirmHours} hours, or the request lapses. After that, ${business.name} confirms the exact time, usually within one business day.`
		],
		packages: PACKAGES.map((p) => {
			const windows = totalWindows(p.layout);
			return `${p.name} (${p.id}): ${p.blurb.toLowerCase()}, about ${windows} windows, ${formatUsd(computeQuote({ windows, stories: p.layout.floors, service: 'exterior', addons: [] }).total)} outside only`;
		}),
		payment: policies.payment,
		changes: `${policies.changes} Agents: reschedule_booking or cancel_booking with the booking_token.`,
		notOffered: policies.notOffered.replace(/ For those, say plainly.*$/, ''),
		limits: `Up to ${agents.requestsPerMinute} requests a minute per address and ${agents.openRequestsPerEmail} open requests per customer email. Refusals come back as HTTP 4xx (or an MCP tool error) with error.code and a message saying what to do.`,
		contact: business.contactEmail
	};
}

/** The guide as Markdown, for /llms.txt. */
export function agentGuideText(origin: string): string {
	const g = agentGuide(origin);
	return [
		`# ${g.title}`,
		'',
		`> ${g.intro}`,
		...(g.demo ? ['', `**${g.demo}**`] : []),
		'',
		'## How to reach us',
		...g.doors.map((d) => `- [${d.name}](${d.url}): ${d.note}`),
		'',
		'## How to order',
		...g.steps.map((s, i) => `${i + 1}. ${s}`),
		'',
		'## Packages',
		...g.packages.map((p) => `- ${p}`),
		'',
		'## Good to know',
		`- Payment: ${g.payment}`,
		`- Changes: ${g.changes}`,
		`- Not offered: ${g.notOffered}`,
		`- Limits: ${g.limits}`,
		`- Contact: ${g.contact}`,
		`- More: [${origin}/agents](${origin}/agents); for people, a live walkthrough: [${origin}/agents/demo](${origin}/agents/demo)`,
		''
	].join('\n');
}

/** schema.org data for the home page, so search engines and agents can read what the business is. */
export function structuredData(origin: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'HomeAndConstructionBusiness',
		name: business.name,
		url: origin,
		email: business.contactEmail,
		description: `Home window cleaning on Maryland's Eastern Shore, priced online in a minute.${business.showcase.enabled ? ' Currently a working demo: bookings are not real.' : ''}`,
		areaServed: COUNTIES.map((c) => ({ '@type': 'AdministrativeArea', name: `${c} County, Maryland` })),
		priceRange: `From ${formatUsd(pricing.minimum)}`,
		openingHoursSpecification: {
			'@type': 'OpeningHoursSpecification',
			dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
			opens: '08:00',
			closes: '17:00'
		},
		paymentAccepted: 'Credit card, check, cash, Venmo, Zelle',
		makesOffer: PACKAGES.map((p) => {
			const windows = totalWindows(p.layout);
			return {
				'@type': 'Offer',
				name: `${p.name} window cleaning, outside`,
				description: `${p.blurb}, about ${windows} windows`,
				price: computeQuote({ windows, stories: p.layout.floors, service: 'exterior', addons: [] }).total,
				priceCurrency: 'USD',
				itemOffered: { '@type': 'Service', serviceType: 'Window cleaning' }
			};
		}),
		potentialAction: {
			'@type': 'ReserveAction',
			target: { '@type': 'EntryPoint', urlTemplate: `${origin}/quote`, actionPlatform: ['https://schema.org/DesktopWebPlatform', 'https://schema.org/MobileWebPlatform'] }
		},
		subjectOf: { '@type': 'WebPage', url: `${origin}/agents`, name: 'Ordering by AI agent' }
	};
}

/** JSON-LD inside a <script>: `<` escaped, so nothing in it can close the tag. */
export const jsonLd = (data: object) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
