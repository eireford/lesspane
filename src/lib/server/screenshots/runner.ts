import * as env from '$app/env/private';
import { PACKAGES, layoutToSearchParams } from '#lib/layout.ts';
import { appVersion } from '#lib/version.ts';
import { SESSION_COOKIE, makeSession } from '#lib/server/session.ts';
import { Browser, findChrome, type Tab } from './browser';
import { effectiveStatus, listRuns, newRunId, pruneRuns, saveRun, saveShot, type Shot, type TestRun, type Viewport } from './runs';

// The screenshot test: opens every page of the site at phone and desktop size in headless Chromium, saves a
// full-page screenshot of each, and fails a page that answers with the wrong status or throws a script error.
// Started from /admin/tests; the results are kept there (runs.ts).

export type TestPage = { path: string; label: string; expect?: number; admin?: boolean };

const sample = PACKAGES.find((p) => p.id === 'family') ?? PACKAGES[0];
const job = layoutToSearchParams(sample.layout);
job.set('service', 'exterior');

/** Every page a person (or an agent) can reach, plus the error pages. /deck is left out: it redirects off-site. */
export const testPages: TestPage[] = [
	{ path: '/', label: 'Home' },
	{ path: '/quote', label: 'Quote, first step' },
	{ path: `/quote?${job}`, label: `Quote, ${sample.name.toLowerCase()} package` },
	{ path: `/book?${job}`, label: 'Booking' },
	{ path: '/quote/thanks', label: 'Thanks page, no request' },
	{ path: '/owner', label: "Owner's side (demo)" },
	{ path: '/built', label: "How it's built" },
	{ path: '/agents', label: 'For AI agents' },
	{ path: '/agents/demo', label: 'Watch an AI assistant book' },
	{ path: '/video', label: 'Video' },
	{ path: '/llms.txt', label: 'llms.txt' },
	{ path: '/manage/not-a-real-link', label: 'Manage link that does not exist', expect: 404 },
	{ path: '/no-such-page', label: 'Page not found', expect: 404 },
	{ path: '/admin', label: 'Admin: requests', admin: true },
	{ path: '/admin/tests', label: 'Admin: tests', admin: true }
];

const viewports: Record<Viewport, { width: number; height: number; deviceScaleFactor: number; mobile: boolean }> = {
	phone: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
	desktop: { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }
};

/** Tallest page captured, in CSS pixels; anything below is cut off (and noted). */
const MAX_HEIGHT = 7000;
/** Firestore documents are at most 1 MiB; leave room for the other fields. */
const MAX_BYTES = 950_000;
const PAGE_TIMEOUT = 25_000;

export type Progress =
	| { type: 'start'; run: TestRun; pruned: string[] }
	| { type: 'shot'; shot: Shot; done: number; planned: number }
	| { type: 'done'; run: TestRun };

/** How the browser gets into /admin: the owner's own session cookie, or the admin password. */
export type AdminAccess = { email: string } | { password: string } | null;

let running = false;

/** Refuses when a run is already going, here or (per the stored runs) on another server. */
export async function canStart(): Promise<string | null> {
	if (running) return 'A screenshot test is already running.';
	const [latest] = await listRuns();
	if (latest && effectiveStatus(latest) === 'running') return 'A screenshot test is already running.';
	if (!findChrome()) return 'No Chromium found on this server (set CHROME_PATH).';
	return null;
}

export async function runScreenshotTest(origin: string, by: string, access: AdminAccess, onProgress: (p: Progress) => void): Promise<TestRun> {
	running = true;
	const pages = testPages.filter((p) => !p.admin || access);
	const run: TestRun = {
		id: newRunId(),
		started_at: new Date().toISOString(),
		status: 'running',
		origin,
		version: appVersion,
		by,
		planned: pages.length * 2,
		shots: [],
		...(!access && { message: 'Admin pages skipped: no way to sign the browser in.' })
	};
	let browser: Browser | null = null;
	try {
		const pruned = await pruneRuns();
		await saveRun(run);
		onProgress({ type: 'start', run, pruned });

		browser = await Browser.launch(findChrome()!);
		const tabs = { phone: await browser.newTab(), desktop: await browser.newTab() };
		for (const v of Object.keys(tabs) as Viewport[]) await prepare(tabs[v], v, origin, access);

		let index = 0;
		for (const page of pages) {
			// Both sizes of a page at once: two tabs, so a run takes about half as long.
			const shots = await Promise.all(
				(['phone', 'desktop'] as Viewport[]).map((v, i) => capture(tabs[v], v, origin, page, index + i, run.id))
			);
			index += shots.length;
			for (const shot of shots) {
				run.shots.push(shot);
				onProgress({ type: 'shot', shot, done: run.shots.length, planned: run.planned });
			}
			await saveRun(run);
		}
		run.status = run.shots.every((s) => s.ok) ? 'passed' : 'failed';
	} catch (e) {
		run.status = 'error';
		run.message = [run.message, e instanceof Error ? e.message : String(e)].filter(Boolean).join(' ');
	} finally {
		run.finished_at = new Date().toISOString();
		await browser?.close();
		running = false;
		await saveRun(run).catch((e) => console.error('screenshot test: could not save the run', e));
	}
	onProgress({ type: 'done', run });
	return run;
}

async function prepare(tab: Tab, viewport: Viewport, origin: string, access: AdminAccess) {
	await tab.cmd('Page.enable');
	await tab.cmd('Runtime.enable');
	await tab.cmd('Network.enable');
	await tab.cmd('Emulation.setDeviceMetricsOverride', viewports[viewport]);
	if (access && 'email' in access && env.SESSION_SECRET) {
		// The signed-in owner's session, for this site only.
		await tab.cmd('Network.setCookie', {
			name: SESSION_COOKIE,
			value: makeSession(access.email, env.SESSION_SECRET),
			url: origin,
			httpOnly: true,
			secure: origin.startsWith('https:'),
			sameSite: 'Lax'
		});
	} else if (access && 'password' in access) {
		// HTTP Basic auth, answered only for this site's /admin pages (never sent to the font server).
		await tab.cmd('Fetch.enable', { patterns: [{ urlPattern: `${origin}/admin*` }], handleAuthRequests: true });
		tab.on('Fetch.requestPaused', (p) => void tab.cmd('Fetch.continueRequest', { requestId: p.requestId }).catch(() => {}));
		tab.on('Fetch.authRequired', (p) =>
			void tab
				.cmd('Fetch.continueWithAuth', {
					requestId: p.requestId,
					authChallengeResponse: { response: 'ProvideCredentials', username: 'admin', password: access.password }
				})
				.catch(() => {})
		);
	}
}

async function capture(tab: Tab, viewport: Viewport, origin: string, page: TestPage, index: number, runId: string): Promise<Shot> {
	const started = Date.now();
	const problems: string[] = [];
	let status: number | null = null;
	// The last answer per frame (after any redirect or auth challenge); the page's own frame is picked below.
	const documents = new Map<string, number>();
	const off = [
		tab.on('Network.responseReceived', (p) => {
			if (p.type === 'Document') documents.set(p.frameId, p.response.status);
		}),
		tab.on('Runtime.exceptionThrown', (p) => problems.push(`Script error: ${p.exceptionDetails?.exception?.description?.split('\n')[0] ?? p.exceptionDetails?.text}`)),
		tab.on('Runtime.consoleAPICalled', (p) => {
			if (p.type === 'error') problems.push(`Console error: ${p.args.map((a: any) => a.value ?? a.description).join(' ').slice(0, 300)}`);
		})
	];
	const shot: Shot = { index, path: page.path, label: page.label, viewport, width: 0, height: 0, bytes: 0, status: null, ok: false, problems, ms: 0 };
	try {
		const loaded = new Promise<void>((resolve) => {
			const stop = tab.on('Page.loadEventFired', () => (stop(), resolve()));
		});
		const nav = await tab.cmd('Page.navigate', { url: origin + page.path });
		if (nav.errorText) throw new Error(`Could not open the page: ${nav.errorText}`);
		await Promise.race([loaded, timeout(PAGE_TIMEOUT, 'The page did not finish loading')]);
		status = documents.get(nav.frameId) ?? null;
		// Web fonts, hydration and first animations.
		await Promise.race([tab.eval('document.fonts.ready.then(() => true)'), timeout(5000, 'Note: web fonts did not load in time.')]).catch((e) => problems.push(e.message));
		await new Promise((r) => setTimeout(r, 700));

		const metrics = await tab.cmd('Page.getLayoutMetrics');
		const width = Math.ceil(metrics.cssLayoutViewport?.clientWidth ?? viewports[viewport].width);
		const fullHeight = Math.ceil(metrics.cssContentSize?.height ?? viewports[viewport].height);
		const height = Math.min(fullHeight, MAX_HEIGHT);
		if (fullHeight > MAX_HEIGHT) problems.push(`Note: the page is ${fullHeight}px tall; only the top ${MAX_HEIGHT}px were captured.`);

		let image: Buffer | null = null;
		for (const quality of [80, 60, 40]) {
			const r = await tab.cmd(
				'Page.captureScreenshot',
				{ format: 'webp', quality, captureBeyondViewport: true, clip: { x: 0, y: 0, width, height, scale: 1 } },
				60_000
			);
			image = Buffer.from(r.data, 'base64');
			if (image.length <= MAX_BYTES) break;
		}
		if (!image || image.length > MAX_BYTES) throw new Error('The screenshot is too large to store.');
		await saveShot(runId, index, image);
		const scale = viewports[viewport].deviceScaleFactor;
		Object.assign(shot, { width: width * scale, height: height * scale, bytes: image.length });
	} catch (e) {
		problems.push(e instanceof Error ? e.message : String(e));
	} finally {
		for (const f of off) f();
	}
	status ??= [...documents.values()].at(-1) ?? null;
	shot.status = status;
	const expected = page.expect ?? 200;
	if (status !== expected) problems.unshift(`Expected HTTP ${expected}, got ${status ?? 'no answer'}.`);
	shot.ok = status === expected && shot.bytes > 0 && problems.every((p) => p.startsWith('Note: '));
	shot.ms = Date.now() - started;
	return shot;
}

const timeout = (ms: number, message: string) => new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms));
