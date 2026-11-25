#!/usr/bin/env node
// Agent smoke test: plays an outside AI agent against a running LessPane, with the official MCP client and the
// HTTP API. Checks the discovery pages, then over MCP: lists the tools, checks a ZIP, gets a quote, and (with
// --book, local servers only) requests a booking, repeats it with the same request_id, confirms it as the
// customer from the email in the dev server's log, and cancels it. See docs/agent-ordering-plan.md.
//
//   npm run smoke:agent                                   # against http://127.0.0.1:5173, no booking
//   npm run smoke:agent -- --book --log dev.log           # and book; dev.log is `npm run dev` output
//   npm run smoke:agent -- --url https://lesspane.net     # staging (never books)

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const { values: opts } = parseArgs({
	options: {
		url: { type: 'string', default: 'http://127.0.0.1:5173' },
		book: { type: 'boolean', default: false },
		log: { type: 'string', default: '' }
	}
});
const base = opts.url.replace(/\/$/, '');
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(base);
if (opts.book && !isLocal) {
	console.error('--book only runs against a local server, so no real booking is ever sent.');
	process.exit(2);
}

let passed = 0;
async function step(name, fn) {
	try {
		const note = await fn();
		passed++;
		console.log(`✓ ${name}${note ? `  ${note}` : ''}`);
	} catch (e) {
		console.error(`✗ ${name}: ${e.message}`);
		process.exit(1);
	}
}
const expect = (cond, msg) => {
	if (!cond) throw new Error(msg);
};

console.log(`Agent smoke test: ${base}`);

await step('Discovery: /agents, /llms.txt, /openapi.json and the home page’s structured data', async () => {
	const agents = await fetch(`${base}/agents`);
	expect(agents.ok, `/agents ${agents.status}`);
	const llms = await (await fetch(`${base}/llms.txt`)).text();
	expect(llms.includes('/mcp') && llms.includes('request_booking'), 'llms.txt lacks the MCP address or the tools');
	const doc = await (await fetch(`${base}/openapi.json`)).json();
	expect(doc.openapi === '3.1.0' && Object.keys(doc.paths).length === 7, 'openapi.json is not the expected document');
	const home = await (await fetch(base)).text();
	const ld = /<script type="application\/ld\+json">(.+?)<\/script>/s.exec(home)?.[1];
	expect(ld && JSON.parse(ld)['@type'] === 'HomeAndConstructionBusiness', 'no JSON-LD on the home page');
	return `${Object.keys(doc.paths).length} API paths`;
});

const client = new Client({ name: 'lesspane-agent-smoke', version: '1.0.0' });
await step('MCP: connect and list the tools', async () => {
	await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp`)));
	const { tools } = await client.listTools();
	expect(tools.length === 7, `expected 7 tools, got ${tools.length}`);
	return `${client.getServerVersion()?.name} ${client.getServerVersion()?.version}: ${tools.map((t) => t.name).join(', ')}`;
});

const tool = async (name, args = {}) => {
	const r = await client.callTool({ name, arguments: args });
	return { error: r.isError, data: r.structuredContent };
};

await step('MCP: business info and a ZIP check', async () => {
	const info = await tool('get_business_info');
	expect(!info.error && info.data.minimum_price > 0, 'no business info');
	const easton = await tool('check_service_area', { zip: '21601' });
	const baltimore = await tool('check_service_area', { zip: '21201' });
	expect(easton.data.served && !baltimore.data.served, 'ZIP check is wrong');
	return `demo: ${info.data.demo}; Easton served, Baltimore not`;
});

let quote;
await step('MCP: a quote, and the same price from the HTTP API', async () => {
	quote = (await tool('get_quote', { package: 'family', service: 'interior_exterior', addons: ['screens'] })).data;
	expect(quote.quote_id && quote.total > 0, 'no quote');
	const viaApi = await (
		await fetch(`${base}/api/v1/quotes`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ package: 'family', service: 'interior_exterior', addons: ['screens'] }) })
	).json();
	expect(viaApi.total === quote.total, `API price ${viaApi.total} differs from MCP ${quote.total}`);
	return `${quote.total_text} for ${quote.windows} windows`;
});

await step('MCP: booking without the person’s approval is refused', async () => {
	const r = await tool('request_booking', { quote_id: quote.quote_id, preferred_date: '2099-01-01', preferred_window: 'morning', email: 'a@example.com', agent: 'smoke' });
	expect(r.error && r.data.error.code === 'not_approved', `expected not_approved, got ${JSON.stringify(r.data)}`);
	return r.data.error.code;
});

if (opts.book) {
	const day = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);
	const requestId = `smoke-${Date.now()}`;
	const email = `agent-smoke-${Date.now()}@example.com`;
	let token;

	await step('MCP: request a booking, then repeat it with the same request_id', async () => {
		const args = { quote_id: quote.quote_id, preferred_date: day, preferred_window: 'morning', email, zip: '21601', agent: 'LessPane agent smoke test', approved_by_customer: true, request_id: requestId };
		const first = await tool('request_booking', args);
		expect(!first.error && first.data.status === 'awaiting_customer', `not awaiting the customer: ${JSON.stringify(first.data)}`);
		const again = await tool('request_booking', args);
		expect(again.data.booking_token === first.data.booking_token && again.data.repeated, 'the retry made a second booking');
		token = first.data.booking_token;
		return `${first.data.status}, ${first.data.total_text}`;
	});

	if (opts.log) {
		await step('The customer confirms from the email', async () => {
			let link;
			for (let i = 0; i < 20 && !link; i++) {
				const log = readFileSync(opts.log, 'utf8');
				const at = log.lastIndexOf(`to=${email}`);
				link = at >= 0 ? /\/confirm\/([A-Za-z0-9_-]{32})/.exec(log.slice(at))?.[1] : undefined;
				if (!link) await new Promise((r) => setTimeout(r, 250));
			}
			expect(link, `no confirm link for ${email} in ${opts.log}`);
			const page = await fetch(`${base}/confirm/${link}`);
			expect(page.ok, `confirm page ${page.status}`);
			// Opening the link changes nothing; the button posts.
			expect((await tool('get_booking', { booking_token: token })).data.status === 'awaiting_customer', 'opening the link confirmed it');
			const res = await fetch(`${base}/confirm/${link}?/confirm`, {
				method: 'POST',
				headers: { origin: base, 'content-type': 'application/x-www-form-urlencoded', 'x-sveltekit-action': 'true' },
				body: ''
			});
			expect(res.ok, `confirm ${res.status}`);
			const now = (await tool('get_booking', { booking_token: token })).data;
			expect(now.status === 'new', `status after confirming: ${now.status}`);
			return now.status_text;
		});
	}

	await step('HTTP: read the booking, then cancel it', async () => {
		const got = await (await fetch(`${base}/api/v1/bookings/${token}`)).json();
		expect(got.booking_token === token, 'booking not found over HTTP');
		const cancelled = await (await fetch(`${base}/api/v1/bookings/${token}/cancel`, { method: 'POST' })).json();
		expect(cancelled.status === 'cancelled', `not cancelled: ${JSON.stringify(cancelled)}`);
		return `${got.status} → cancelled`;
	});
}

await client.close();
console.log(`\nAll ${passed} steps passed.`);
