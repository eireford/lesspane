import * as env from '$app/env/private';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

// Headless Chromium driven over the DevTools protocol with Node's own WebSocket, as scripts/smoke.mjs does: no
// Puppeteer or Playwright. Used by the screenshot test in /admin/tests. The container installs Chromium
// (Dockerfile); locally any installed Chromium or Chrome works.

const CANDIDATES = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'];

export function findChrome(): string | null {
	for (const c of [env.CHROME_PATH, ...CANDIDATES]) if (c && existsSync(c)) return c;
	return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Message = { id?: number; method?: string; params?: any; result?: any; error?: { message: string }; sessionId?: string };
type Listener = (params: any) => void;

export class Browser {
	private nextId = 0;
	private pending = new Map<number, { resolve: (m: Message) => void; reject: (e: Error) => void }>();
	private listeners = new Map<string, Set<Listener>>();

	private constructor(
		private proc: ChildProcess,
		private ws: WebSocket,
		private profile: string
	) {
		ws.onmessage = (e) => {
			const msg = JSON.parse(String(e.data)) as Message;
			if (msg.id !== undefined) {
				const p = this.pending.get(msg.id);
				this.pending.delete(msg.id);
				if (msg.error) p?.reject(new Error(msg.error.message));
				else p?.resolve(msg);
			} else if (msg.method) {
				for (const fn of this.listeners.get(`${msg.sessionId ?? ''}:${msg.method}`) ?? []) fn(msg.params);
			}
		};
		ws.onclose = () => {
			for (const p of this.pending.values()) p.reject(new Error('Chromium closed the connection'));
			this.pending.clear();
		};
	}

	static async launch(chrome: string): Promise<Browser> {
		// Inside the project's .data folder rather than /tmp: the snap-packaged Chromium can't use /tmp.
		const profile = path.resolve('.data', `chrome-${randomBytes(4).toString('hex')}`);
		await mkdir(profile, { recursive: true });
		const proc = spawn(
			chrome,
			[
				'--headless=new',
				'--no-sandbox',
				'--disable-gpu',
				'--disable-dev-shm-usage',
				'--no-first-run',
				'--no-default-browser-check',
				'--hide-scrollbars',
				'--mute-audio',
				'--remote-debugging-port=0',
				`--user-data-dir=${profile}`,
				'about:blank'
			],
			{ stdio: 'ignore' }
		);
		let port = '';
		for (let i = 0; i < 80 && !port && proc.exitCode === null; i++) {
			await sleep(250);
			port = await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8').then((s) => s.split('\n')[0], () => '');
		}
		if (!port) {
			proc.kill('SIGKILL');
			await rm(profile, { recursive: true, force: true });
			throw new Error('Chromium did not start');
		}
		const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
		const ws = new WebSocket(webSocketDebuggerUrl);
		await new Promise<void>((resolve, reject) => {
			ws.onopen = () => resolve();
			ws.onerror = () => reject(new Error('Could not connect to Chromium'));
		});
		return new Browser(proc, ws, profile);
	}

	send(method: string, params: object = {}, sessionId?: string, timeoutMs = 30_000): Promise<any> {
		const id = ++this.nextId;
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pending.delete(id);
				reject(new Error(`${method} timed out`));
			}, timeoutMs);
			this.pending.set(id, {
				resolve: (m) => (clearTimeout(timer), resolve(m.result)),
				reject: (e) => (clearTimeout(timer), reject(e))
			});
			this.ws.send(JSON.stringify({ id, method, params, sessionId }));
		});
	}

	on(sessionId: string, method: string, fn: Listener): () => void {
		const key = `${sessionId}:${method}`;
		if (!this.listeners.has(key)) this.listeners.set(key, new Set());
		this.listeners.get(key)!.add(fn);
		return () => this.listeners.get(key)?.delete(fn);
	}

	/** A new tab, attached in "flatten" mode so its commands and events share this one connection. */
	async newTab(): Promise<Tab> {
		const { targetId } = await this.send('Target.createTarget', { url: 'about:blank' });
		const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true });
		return new Tab(this, targetId, sessionId);
	}

	async close() {
		try {
			await this.send('Browser.close', {}, undefined, 3000);
		} catch {
			// Already gone.
		}
		try {
			this.ws.close();
		} catch {}
		this.proc.kill('SIGKILL');
		await rm(this.profile, { recursive: true, force: true }).catch(() => {});
	}
}

export class Tab {
	constructor(
		private browser: Browser,
		private targetId: string,
		readonly sessionId: string
	) {}

	cmd(method: string, params: object = {}, timeoutMs?: number) {
		return this.browser.send(method, params, this.sessionId, timeoutMs);
	}

	on(method: string, fn: Listener) {
		return this.browser.on(this.sessionId, method, fn);
	}

	async eval<T>(expression: string): Promise<T> {
		const r = await this.cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
		return r.result?.value as T;
	}

	close() {
		return this.browser.send('Target.closeTarget', { targetId: this.targetId }).catch(() => {});
	}
}
