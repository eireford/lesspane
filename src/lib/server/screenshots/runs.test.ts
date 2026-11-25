import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The screenshot test's storage, on the local file store in a temporary folder: ids, retention, reading back.

vi.mock('$app/env/private', () => ({ STORAGE: undefined }));
vi.mock('#lib/server/store.ts', () => ({ db: () => Promise.reject(new Error('no Firestore in tests')) }));

const { KEEP_RUNS, RUN_ID, effectiveStatus, getRun, getShot, listRuns, newRunId, pruneRuns, saveRun, saveShot } = await import('./runs');
type TestRun = import('./runs').TestRun;

let tmp = '';
beforeEach(async () => {
	tmp = await mkdtemp(path.join(tmpdir(), 'lesspane-runs-'));
	vi.spyOn(process, 'cwd').mockReturnValue(tmp);
});
afterEach(async () => {
	vi.restoreAllMocks();
	await rm(tmp, { recursive: true, force: true });
});

const run = (minutesAgo: number, status: TestRun['status'] = 'passed'): TestRun => {
	const at = new Date(Date.UTC(2026, 10, 25, 12) - minutesAgo * 60_000);
	return { id: newRunId(at), started_at: at.toISOString(), status, origin: 'http://x', version: '0.8.0', by: 'admin', planned: 2, shots: [] };
};

describe('run ids', () => {
	it('sort by time and are safe in a path', () => {
		const a = newRunId(new Date('2026-11-25T19:04:05.123Z'));
		expect(a).toMatch(RUN_ID);
		expect(a.startsWith('2026-11-25T19-04-05-123Z-')).toBe(true);
		expect(newRunId(new Date('2026-11-25T19:04:06Z')) > a).toBe(true);
	});

	it('refuses anything else when reading', async () => {
		expect(await getRun('../../etc/passwd')).toBeNull();
		expect(await getShot('../x', 0)).toBeNull();
		expect(await getShot(newRunId(), -1)).toBeNull();
	});
});

describe('storage and retention', () => {
	it('saves and reads back a run and its screenshots', async () => {
		const r = run(0);
		await saveRun(r);
		await saveShot(r.id, 3, Buffer.from('webp bytes'));
		expect((await getRun(r.id))?.id).toBe(r.id);
		expect((await getShot(r.id, 3))?.toString()).toBe('webp bytes');
		expect(await getShot(r.id, 4)).toBeNull();
	});

	it(`keeps the newest ${KEEP_RUNS} runs: starting one deletes the rest, screenshots and all`, async () => {
		const runs = Array.from({ length: KEEP_RUNS + 2 }, (_, i) => run(i * 10)); // newest first
		for (const r of runs) {
			await saveRun(r);
			await saveShot(r.id, 0, Buffer.from('x'));
		}
		const pruned = await pruneRuns(); // room for the run about to start
		expect(pruned).toEqual(runs.slice(KEEP_RUNS - 1).map((r) => r.id));
		const left = await listRuns();
		expect(left.map((r) => r.id)).toEqual(runs.slice(0, KEEP_RUNS - 1).map((r) => r.id));
		expect((await readdir(path.join(tmp, '.data', 'test-runs'))).length).toBe(KEEP_RUNS - 1);
		expect(await getShot(runs.at(-1)!.id, 0)).toBeNull();
	});

	it('does nothing when there are few runs', async () => {
		await saveRun(run(0));
		expect(await pruneRuns()).toEqual([]);
	});
});

describe('status', () => {
	it('calls a run that never finished interrupted after a while', () => {
		const r = run(0, 'running');
		const started = Date.parse(r.started_at);
		expect(effectiveStatus(r, started + 60_000)).toBe('running');
		expect(effectiveStatus(r, started + 60 * 60_000)).toBe('interrupted');
		expect(effectiveStatus(run(0, 'failed'), started + 60 * 60_000)).toBe('failed');
	});
});
