import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { curlFor, type ToolInfo } from './agent-client';
import { dayText, discovery, makers, nextTuesday, scenarios } from './agent-demo';

// The AI agents demo's content (/agents/demo): it must point at real tools and real pages, and stay honest.

const origin = 'https://lesspane.example';
const toolNames = [...readFileSync('src/lib/server/agent-api.ts', 'utf8').matchAll(/^\t\tname: '([a-z_]+)'/gm)].map((m) => m[1]);

describe('the conversations', () => {
	it('only call tools LessPane has', () => {
		expect(toolNames).toHaveLength(7);
		for (const s of scenarios) for (const step of s.steps) if (step.kind === 'call') expect(toolNames).toContain(step.tool);
	});

	it('never send a booking for real', () => {
		for (const s of scenarios)
			for (const step of s.steps) if (step.kind === 'call' && !['get_business_info', 'check_service_area', 'get_quote'].includes(step.tool)) expect(step.live).toBe(false);
	});

	it('book on a Tuesday at least three days ahead, and say the weekday', () => {
		for (let d = 0; d < 14; d++) {
			const now = new Date(2026, 10, 20 + d, 23, 30);
			const t = nextTuesday(now);
			expect(new Date(`${t}T12:00:00Z`).getUTCDay()).toBe(2);
			const ahead = (Date.parse(`${t}T00:00:00Z`) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86_400_000;
			expect(ahead).toBeGreaterThanOrEqual(3);
			expect(ahead).toBeLessThan(10);
			expect(dayText(t)).toMatch(/^Tuesday, /);
		}
	});
});

describe('the makers', () => {
	const all = makers(origin);

	it('use this site\'s own MCP address and link their own current help', () => {
		for (const m of all) {
			const text = JSON.stringify(m);
			if (m.app || m.snippets.length) expect(text).toContain(`${origin}/mcp`);
			expect(m.docs.length).toBeGreaterThan(0);
			for (const d of m.docs) expect(d.url).toMatch(/^https:\/\//);
			expect(m.checked.length).toBeGreaterThan(10);
		}
	});

	it('claim only the checks that happened (update this when someone tries an app by hand)', () => {
		for (const m of all) expect(m.checked).toMatch(/^(Checked automatically|Not yet tried by hand|Not tried yet)/);
	});
});

describe('discovery', () => {
	it('fetches only from this site', () => {
		for (const d of discovery) if (d.path) expect(d.path.startsWith('/')).toBe(true);
	});
});

describe('curl', () => {
	const quote: ToolInfo = { name: 'get_quote', title: '', description: '', readOnly: true, http: { method: 'POST', path: '/quotes' } };
	const area: ToolInfo = { name: 'check_service_area', title: '', description: '', readOnly: true, http: { method: 'GET', path: '/service-area' } };

	it('builds the same call for MCP and HTTP', () => {
		expect(curlFor('http', origin, area, { zip: '21601' })).toBe(`curl -s '${origin}/api/v1/service-area?zip=21601'`);
		const post = curlFor('http', origin, quote, { package: "o'brien" });
		expect(post).toContain(`${origin}/api/v1/quotes`);
		expect(post).toContain(`'{"package":"o'\\''brien"}'`);
		const mcp = curlFor('mcp', origin, quote, { package: 'family' });
		expect(mcp).toContain(`${origin}/mcp`);
		expect(mcp).toContain('"method":"tools/call"');
		expect(mcp).toContain('mcp-protocol-version');
	});
});
