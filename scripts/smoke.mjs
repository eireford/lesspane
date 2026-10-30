#!/usr/bin/env node
// Smoke test: opens the quote page in headless Chromium at phone size, plays every control with real
// gestures, checks the price reacts, and saves a screenshot per step. Exits non-zero on any failure
// or page error. Needs a running server (npm run dev) and Chromium or Chrome installed.
//
//   npm run smoke                          # against http://127.0.0.1:5173, screenshots in .shots/
//   npm run smoke -- --book                # also submit a booking (local file storage only)
//   npm run smoke -- --url https://lesspane.net --width 1280 --height 900
//
// Uses only Node built-ins: Chromium is driven over the DevTools protocol with Node's WebSocket.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values: opts } = parseArgs({
	options: {
		url: { type: 'string', default: 'http://127.0.0.1:5173' },
		out: { type: 'string', default: '.shots' },
		width: { type: 'string', default: '420' },
		height: { type: 'string', default: '860' },
		book: { type: 'boolean', default: false },
		chrome: { type: 'string', default: process.env.CHROME ?? '' }
	}
});

const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(opts.url);
if (opts.book && !isLocal) {
	console.error('--book only runs against a local server, so no real booking is ever sent.');
	process.exit(2);
}

const out = path.resolve(opts.out);
mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Launch Chromium ----------

const candidates = [opts.chrome, 'chromium-browser', 'chromium', 'google-chrome', 'google-chrome-stable'].filter(Boolean);
async function which(cmd) {
	return new Promise((res) => {
		const p = spawn('sh', ['-c', `command -v ${cmd}`]);
		p.on('close', (code) => res(code === 0));
	});
}
let chrome = '';
for (const c of candidates) if (existsSync(c) || (await which(c))) { chrome = c; break; }
if (!chrome) {
	console.error('No Chromium or Chrome found. Install one, or pass --chrome /path/to/chrome (or set CHROME).');
	process.exit(2);
}

// Kept inside the project (not /tmp) because the snap-packaged Chromium can't write to /tmp.
const profile = path.join(out, '.profile');
rmSync(profile, { recursive: true, force: true });
const browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], {
	stdio: 'ignore'
});
let port = '';
for (let i = 0; i < 60 && !port; i++) {
	await sleep(250);
	try {
		port = readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0];
	} catch {}
}
if (!port) fail('Chromium did not start');
const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();

// ---------- DevTools protocol ----------

const ws = new WebSocket(webSocketDebuggerUrl);
let msgId = 0;
const pending = new Map();
const pageErrors = [];
ws.onmessage = (m) => {
	const msg = JSON.parse(m.data);
	if (msg.id && pending.has(msg.id)) pending.get(msg.id)(msg);
	if (msg.method === 'Runtime.exceptionThrown') pageErrors.push(msg.params.exceptionDetails.exception?.description ?? 'exception');
	if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error')
		pageErrors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
};
await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}, sessionId) =>
	new Promise((res) => {
		const i = ++msgId;
		pending.set(i, res);
		ws.send(JSON.stringify({ id: i, method, params, sessionId }));
	});
const { result: target } = await send('Target.createTarget', { url: 'about:blank' });
const { result: att } = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
const cmd = (method, params) => send(method, params, att.sessionId);

const js = async (expr) => {
	const r = await cmd('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
	if (r.result.exceptionDetails) throw new Error(`${expr}\n${r.result.exceptionDetails.exception?.description}`);
	return r.result.result?.value;
};
const mouse = (type, x, y) =>
	cmd('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
async function drag([x0, y0], [x1, y1], steps = 14) {
	await mouse('mousePressed', x0, y0);
	for (let k = 1; k <= steps; k++) await mouse('mouseMoved', x0 + ((x1 - x0) * k) / steps, y0 + ((y1 - y0) * k) / steps);
	await mouse('mouseReleased', x1, y1);
	await sleep(700);
}
async function tap([x, y]) {
	await mouse('mousePressed', x, y);
	await mouse('mouseReleased', x, y);
	await sleep(500);
}
/** Scrolls an element into view and returns its box. */
async function box(sel) {
	await js(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({ block: 'center' })`);
	await sleep(300);
	return js(`(() => { const b = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; })()`);
}
const at = (b, fx, fy) => [b.x + b.w * fx, b.y + b.h * fy];
let shotN = 0;
async function shot(name) {
	const r = await cmd('Page.captureScreenshot', { format: 'png' });
	const file = path.join(out, `${String(++shotN).padStart(2, '0')}-${name}.png`);
	writeFileSync(file, Buffer.from(r.result.data, 'base64'));
}

// ---------- Steps ----------

const results = [];
function fail(msg) {
	console.error(`✗ ${msg}`);
	cleanup(1);
}
async function step(name, fn) {
	try {
		const note = await fn();
		results.push(name);
		console.log(`✓ ${name}${note ? `  ${note}` : ''}`);
		await shot(name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
	} catch (e) {
		await shot(`FAILED-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`).catch(() => {});
		fail(`${name}: ${e.message}`);
	}
}
function cleanup(code) {
	try {
		ws.close();
	} catch {}
	browser.kill();
	process.exit(code);
}
const expect = (cond, msg) => {
	if (!cond) throw new Error(msg);
};
const price = () => js(`document.querySelector('.amount')?.textContent.trim()`);

await cmd('Emulation.setDeviceMetricsOverride', { width: +opts.width, height: +opts.height, deviceScaleFactor: 1, mobile: +opts.width < 600 });
await cmd('Page.enable');
await cmd('Runtime.enable');
console.log(`Smoke test: ${opts.url} at ${opts.width}×${opts.height}, screenshots in ${path.relative(process.cwd(), out) || '.'}/`);

await step('Page loads with a price', async () => {
	await cmd('Page.navigate', { url: opts.url });
	for (let i = 0; i < 40 && !(await js(`!!document.querySelector('.amount')`)); i++) await sleep(250);
	await sleep(800); // let hydration finish
	const p = await price();
	expect(/^\$\d/.test(p ?? ''), `no price shown (got ${p})`);
	return p;
});

await step('Swipe the house card', async () => {
	const before = await js(`document.querySelector('.house svg').getAttribute('aria-label')`);
	const b = await box('.house-stack .swipe');
	await drag(at(b, 0.7, 0.5), at(b, -0.3, 0.5));
	const after = await js(`document.querySelector('.house svg').getAttribute('aria-label')`);
	expect(after !== before, 'house did not change');
	return after;
});

await step('Pull the squeegee', async () => {
	const b = await box('.glass');
	await drag(at(b, 0.4, 0.5), [b.x + b.w + 30, b.y + b.h / 2]);
	const high = await js(`document.querySelector('.glass').getAttribute('aria-valuenow')`);
	const priceHigh = await price();
	await drag(at(b, 0.99, 0.5), at(b, 0.5, 0.5));
	const mid = await js(`document.querySelector('.glass').getAttribute('aria-valuenow')`);
	expect(high === '40', `expected 40 windows at the right end, got ${high}`);
	expect(Number(mid) > 15 && Number(mid) < 25, `expected about 20 windows mid-way, got ${mid}`);
	return `40 → ${priceHigh}, ${mid} → ${await price()}`;
});

await step('Flip the window', async () => {
	const before = await price();
	await tap(at(await box('.flip'), 0.5, 0.5));
	expect((await js(`document.querySelector('.flip').getAttribute('aria-pressed')`)) === 'true', 'did not flip to inside');
	return `${before} → ${await price()}`;
});

await step('Peel the stickers', async () => {
	let b = await box('.sticker');
	await drag(at(b, 0.5, 0.5), [b.x + b.w / 2 + 90, b.y - 60]);
	b = await box('.sticker');
	await tap(at(b, 0.5, 0.5));
	const chips = await js(`document.querySelectorAll('.chip').length`);
	expect(chips === 2, `expected 2 peeled stickers, got ${chips}`);
	return `2 fixed → ${await price()}`;
});

await step('Pick a day and drag the sun', async () => {
	await js(`document.querySelectorAll('.day')[4].click()`);
	const b = await box('.sky');
	await drag(at(b, 0.28, 0.35), at(b, 0.85, 0.4));
	const when = await js(`document.querySelector('.sky').getAttribute('aria-valuetext')`);
	expect(when.startsWith('Afternoon'), `sun did not move to the afternoon (${when})`);
	return `${await js(`document.querySelector('.day.on').getAttribute('aria-label')`)}, ${when}`;
});

if (opts.book) {
	await step('Book', async () => {
		await js(`(() => {
			const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
			set('address', '12 Goldsborough St'); set('zip', '21601'); set('name', 'Smoke Test');
			set('phone', '4105550100'); set('email', 'smoke@example.com');
			document.querySelector('.send').click();
		})()`);
		for (let i = 0; i < 40 && (await js('location.pathname')) !== '/quote/thanks'; i++) await sleep(250);
		expect((await js('location.pathname')) === '/quote/thanks', 'did not reach the confirmation page');
		return await js(`document.querySelector('h1')?.textContent`);
	});
}

if (pageErrors.length) fail(`page errors:\n  ${pageErrors.join('\n  ')}`);
console.log(`\nAll ${results.length} steps passed.`);
cleanup(0);
