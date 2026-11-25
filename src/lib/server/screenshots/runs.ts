import * as env from '$app/env/private';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { db } from '#lib/server/store.ts';

// Where the screenshot test keeps its runs: Firestore on Cloud Run (a run document, plus one document per
// screenshot, each under Firestore's 1 MiB limit), files in .data/test-runs locally. Only the newest
// KEEP_RUNS are kept: starting a run deletes the older ones and their screenshots.

export const KEEP_RUNS = 10;

export type Viewport = 'phone' | 'desktop';
export type RunStatus = 'running' | 'passed' | 'failed' | 'error';

export type Shot = {
	index: number;
	path: string;
	label: string;
	viewport: Viewport;
	/** Image size in pixels and bytes; 0 when no screenshot could be taken. */
	width: number;
	height: number;
	bytes: number;
	/** The page's HTTP status, or null if it never answered. */
	status: number | null;
	ok: boolean;
	/** What went wrong: an unexpected status, script errors in the page, a timeout. */
	problems: string[];
	ms: number;
};

export type TestRun = {
	id: string;
	started_at: string;
	finished_at?: string;
	status: RunStatus;
	origin: string;
	version: string;
	/** Who started it: the signed-in owner's email, or "admin" with the password. */
	by: string;
	/** How many screenshots the run will take. */
	planned: number;
	shots: Shot[];
	message?: string;
};

const RUNS = 'test_runs';
const SHOTS = 'test_shots';
/** Resolved on each use, so it follows the working directory (tests point it at a temporary folder). */
const dir = (...parts: string[]) => path.resolve('.data', 'test-runs', ...parts);

/** A run id sorts by time and is safe in a path and a URL: 2026-11-25T19-04-05-123Z-a1b2. */
export const RUN_ID = /^\d{4}-\d\d-\d\dT\d\d-\d\d-\d\d-\d{3}Z-[0-9a-f]{4}$/;
export const newRunId = (now = new Date()) =>
	`${now.toISOString().replace(/[:.]/g, '-')}-${Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0')}`;

/** A run still "running" after this long was cut off (the server restarted or the request was dropped). */
const STALE_MS = 15 * 60_000;
export const effectiveStatus = (r: TestRun, now = Date.now()): RunStatus | 'interrupted' =>
	r.status === 'running' && now - Date.parse(r.started_at) > STALE_MS ? 'interrupted' : r.status;

interface RunStore {
	saveRun(run: TestRun): Promise<void>;
	getRun(id: string): Promise<TestRun | null>;
	listRuns(): Promise<TestRun[]>;
	saveShot(runId: string, index: number, image: Buffer): Promise<void>;
	getShot(runId: string, index: number): Promise<Buffer | null>;
	deleteRun(id: string): Promise<void>;
}

const shotDocId = (runId: string, index: number) => `${runId}_${String(index).padStart(3, '0')}`;

const firestoreRuns: RunStore = {
	async saveRun(run) {
		await (await db()).collection(RUNS).doc(run.id).set(JSON.parse(JSON.stringify(run)));
	},
	async getRun(id) {
		const snap = await (await db()).collection(RUNS).doc(id).get();
		return snap.exists ? (snap.data() as TestRun) : null;
	},
	async listRuns() {
		// Never more than KEEP_RUNS + 1 are stored; the limit guards against old runs a failed cleanup left behind.
		const snap = await (await db()).collection(RUNS).orderBy('started_at', 'desc').limit(50).get();
		return snap.docs.map((d) => d.data() as TestRun);
	},
	async saveShot(runId, index, image) {
		await (await db()).collection(SHOTS).doc(shotDocId(runId, index)).set({ run_id: runId, index, image });
	},
	async getShot(runId, index) {
		const snap = await (await db()).collection(SHOTS).doc(shotDocId(runId, index)).get();
		const image = snap.exists ? snap.get('image') : null;
		return image ? Buffer.from(image) : null;
	},
	async deleteRun(id) {
		const firestore = await db();
		const shots = await firestore.collection(SHOTS).where('run_id', '==', id).get();
		const batch = firestore.batch();
		for (const d of shots.docs) batch.delete(d.ref);
		batch.delete(firestore.collection(RUNS).doc(id));
		await batch.commit();
	}
};

const fileRuns: RunStore = {
	async saveRun(run) {
		await mkdir(dir(run.id), { recursive: true });
		await writeFile(dir(run.id, 'run.json'), JSON.stringify(run, null, 2));
	},
	async getRun(id) {
		return readFile(dir(id, 'run.json'), 'utf8').then((s) => JSON.parse(s) as TestRun, () => null);
	},
	async listRuns() {
		const ids = await readdir(dir()).catch(() => [] as string[]);
		const runs = await Promise.all(ids.filter((id) => RUN_ID.test(id)).map((id) => fileRuns.getRun(id)));
		return runs.filter((r): r is TestRun => !!r).sort((a, b) => b.started_at.localeCompare(a.started_at));
	},
	async saveShot(runId, index, image) {
		await mkdir(dir(runId), { recursive: true });
		await writeFile(dir(runId, `${index}.webp`), image);
	},
	async getShot(runId, index) {
		return readFile(dir(runId, `${index}.webp`)).catch(() => null);
	},
	async deleteRun(id) {
		await rm(dir(id), { recursive: true, force: true });
	}
};

const store = (): RunStore => (env.STORAGE === 'firestore' ? firestoreRuns : fileRuns);

export const saveRun = (run: TestRun) => store().saveRun(run);
export const listRuns = () => store().listRuns();
export const saveShot = (runId: string, index: number, image: Buffer) => store().saveShot(runId, index, image);

export async function getRun(id: string) {
	return RUN_ID.test(id) ? store().getRun(id) : null;
}

export async function getShot(runId: string, index: number) {
	return RUN_ID.test(runId) && Number.isInteger(index) && index >= 0 && index < 1000 ? store().getShot(runId, index) : null;
}

/**
 * Deletes every run but the newest `keep`, with their screenshots. Called as a run starts, with room for the
 * new one, so at most KEEP_RUNS are ever stored. Returns the ids it deleted.
 */
export async function pruneRuns(keep = KEEP_RUNS - 1): Promise<string[]> {
	const old = (await listRuns()).slice(keep);
	for (const r of old) await store().deleteRun(r.id);
	return old.map((r) => r.id);
}
