#!/usr/bin/env node
// Smoke test: opens the landing page in headless Chromium at phone size, checks the packages (one opens its
// estimate), then takes the quick-questions path and walks the quote process with
// real gestures (arrow, swipe, accept, skip to summary, extras), checks the price reacts, moves on to the
// booking page (day and sun), and saves a screenshot per step. Exits non-zero on any failure
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
		scale: { type: 'string', default: '1' }, // device pixel ratio; 2 or 3 for sharp phone screenshots
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

await cmd('Emulation.setDeviceMetricsOverride', { width: +opts.width, height: +opts.height, deviceScaleFactor: +opts.scale, mobile: +opts.width < 600 });
await cmd('Page.enable');
await cmd('Runtime.enable');
console.log(`Smoke test: ${opts.url} at ${opts.width}×${opts.height}, screenshots in ${path.relative(process.cwd(), out) || '.'}/`);

await step('Landing offers packages and the quick questions', async () => {
	await cmd('Page.navigate', { url: opts.url });
	for (let i = 0; i < 40 && !(await js(`!!document.querySelector('.package')`)); i++) await sleep(250);
	await sleep(800); // let hydration finish
	const names = await js(`[...document.querySelectorAll('.package .name')].map(n => n.textContent.trim()).join(', ')`);
	expect(names === 'Cottage, Family home, Large home', `packages: ${names}`);
	expect(await js(`!!document.querySelector('a.questions[href="/quote"]')`), 'no quick-questions link');
	return names;
});

await step('A package opens its estimate', async () => {
	const want = await js(`document.querySelector('[data-package="family"] .price').textContent.trim()`);
	await tap(at(await box('[data-package="family"]'), 0.5, 0.5));
	for (let i = 0; i < 40 && (await js('location.pathname')) !== '/quote'; i++) await sleep(250);
	for (let i = 0; i < 40 && !(await js(`!!document.querySelector('.summary')`)); i++) await sleep(250);
	await sleep(500);
	expect((await js(`document.querySelector('.flow .title')?.textContent.trim()`)) === 'Your estimate', 'package did not open the summary');
	expect((await price()) === want, `summary price ${await price()} differs from package ${want}`);
	expect(await js(`!!document.querySelector('a.start-over[href="/"]')`), 'no Start over link at the bottom');
	return `Family home → ${want}`;
});

await step('Quick questions start with a price', async () => {
	await cmd('Page.navigate', { url: opts.url });
	for (let i = 0; i < 40 && !(await js(`!!document.querySelector('a.questions')`)); i++) await sleep(250);
	await sleep(800);
	await tap(at(await box('a.questions'), 0.5, 0.5));
	for (let i = 0; i < 40 && !(await js(`!!document.querySelector('.flow .swipe')`)); i++) await sleep(250);
	await sleep(800);
	const p = await price();
	expect(/^\$\d/.test(p ?? ''), `no price shown (got ${p})`);
	return p;
});

const title = () => js(`document.querySelector('.flow .title')?.textContent.trim()`);
const value = () => js(`document.querySelector('.value strong')?.textContent.trim()`);
const click = (label) => js(`[...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || b.textContent).includes(${JSON.stringify(label)})).click()`);

await step('Floors: change with the arrow, then accept', async () => {
	expect((await title()) === 'How many floors?', `first step is "${await title()}"`);
	const before = await price();
	await click('More');
	await sleep(400);
	expect((await value()) === '3 floors', `expected 3 floors, got ${await value()}`);
	const after = await price();
	await click('Looks right');
	await sleep(500);
	return `3 floors: ${before} → ${after}`;
});

await step('Sides: swipe to change, then accept', async () => {
	expect((await title()) === 'Which sides get cleaned?', `second step is "${await title()}"`);
	const b = await box('.flow .swipe');
	await drag(at(b, 0.3, 0.5), at(b, 1.2, 0.5)); // swipe right = previous option
	expect((await value()) === 'Three sides', `expected Three sides, got ${await value()}`);
	const p = await price();
	await click('Looks right');
	await sleep(500);
	return `Three sides → ${p}`;
});

await step('Windows: swipe one floor up a bucket, accept', async () => {
	expect((await title()) === 'Front · Ground floor', `third step is "${await title()}"`);
	const b = await box('.flow .swipe');
	await drag(at(b, 0.7, 0.5), at(b, -0.3, 0.5)); // swipe left = next option
	expect((await value()) === '5–6 windows', `expected 5–6 windows, got ${await value()}`);
	await click('Looks right');
	await sleep(500);
	expect((await title()) === 'Front · 2nd floor', `next step is "${await title()}"`);
	return `front ground 5–6 → ${await price()}`;
});

await step('Use suggested counts and reach the summary', async () => {
	await click('Use suggested counts');
	await sleep(500);
	expect((await title()) === 'Your estimate', `expected the summary, got "${await title()}"`);
	const lines = await js(`[...document.querySelectorAll('.summary .lines li')].length`);
	expect(lines === 5, `expected 5 summary lines (floors/sides + 3 sides + total), got ${lines}`);
	return await js(`document.querySelector('.summary .total').textContent.trim().replace(/\s+/g, ' ')`);
});

await step('Add two extras', async () => {
	const before = await price();
	await tap(at(await box('.extra'), 0.5, 0.5));
	await js(`document.querySelectorAll('.extra')[2].click()`);
	await sleep(400);
	const on = await js(`document.querySelectorAll('.extra.on').length`);
	expect(on === 2, `expected 2 extras on, got ${on}`);
	return `${before} → ${await price()}`;
});

await step('Open the booking page', async () => {
	const want = await price();
	await js(`document.querySelector('.book-cta').scrollIntoView({ block: 'center' })`);
	await sleep(300);
	await tap(at(await box('.book-cta'), 0.5, 0.5));
	for (let i = 0; i < 40 && (await js('location.pathname')) !== '/book'; i++) await sleep(250);
	expect((await js('location.pathname')) === '/book', 'did not reach /book');
	for (let i = 0; i < 40 && !(await js(`!!document.querySelector('.sky')`)); i++) await sleep(250);
	await sleep(800);
	const got = await js(`document.querySelector('.summary .amount')?.textContent.trim()`);
	expect(got === want, `booking page price ${got} differs from quote ${want}`);
	return `same price ${got}`;
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
	await step('Book with only an email', async () => {
		await js(`(() => {
			const el = document.getElementById('email');
			el.value = 'smoke@example.com';
			el.dispatchEvent(new Event('input', { bubbles: true }));
			document.querySelector('.send').click();
		})()`);
		for (let i = 0; i < 40 && (await js('location.pathname')) !== '/quote/thanks'; i++) await sleep(250);
		expect((await js('location.pathname')) === '/quote/thanks', 'did not reach the confirmation page');
		return await js(`document.querySelector('h1')?.textContent`);
	});

	await step('Manage link: reschedule, then cancel', async () => {
		const href = await js(`document.querySelector('a[href^="/manage/"]')?.getAttribute('href')`);
		expect(href, 'no manage link on the thanks page');
		await tap(at(await box('a[href^="/manage/"]'), 0.5, 0.5));
		for (let i = 0; i < 40 && !(await js(`!!document.querySelector('.booking')`)); i++) await sleep(250);
		await sleep(800);
		const before = await js(`document.querySelector('.when').textContent.trim()`);
		await js(`document.querySelectorAll('.day')[6].click()`);
		await sleep(300);
		await js(`document.querySelector('form.change button[type=submit]').click()`);
		for (let i = 0; i < 40 && !(await js(`!!document.querySelector('.notice')`)); i++) await sleep(250);
		const after = await js(`document.querySelector('.when').textContent.trim()`);
		expect(after !== before, `day did not change (${after})`);
		await js(`document.querySelector('.cancel .link').click()`);
		await sleep(300);
		await js(`document.querySelector('.cancel .danger').click()`);
		for (let i = 0; i < 40 && (await js(`document.querySelector('.status')?.textContent.trim()`)) !== 'Cancelled'; i++) await sleep(250);
		expect((await js(`document.querySelector('.status').textContent.trim()`)) === 'Cancelled', 'not cancelled');
		expect(!(await js(`!!document.querySelector('form.change')`)), 'still offers changes after cancelling');
		return `${before} → ${after} → Cancelled`;
	});
}

await step('A wrong manage link shows not found', async () => {
	const res = await fetch(new URL('/manage/' + 'x'.repeat(32), opts.url));
	expect(res.status === 404, `expected 404, got ${res.status}`);
	return '404';
});

if (pageErrors.length) fail(`page errors:\n  ${pageErrors.join('\n  ')}`);
console.log(`\nAll ${results.length} steps passed.`);
cleanup(0);
