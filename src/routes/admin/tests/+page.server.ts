import { business } from '#lib/config.ts';
import { findChrome } from '#lib/server/screenshots/browser.ts';
import { testPages } from '#lib/server/screenshots/runner.ts';
import { KEEP_RUNS, effectiveStatus, getRun, listRuns } from '#lib/server/screenshots/runs.ts';
import type { PageServerLoad } from './$types';

// Owner-only (hooks.server.ts): the screenshot test's last runs, and one run's screenshots.
export const load: PageServerLoad = async ({ url, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store' });
	const runs = (await listRuns()).slice(0, KEEP_RUNS);
	const wanted = url.searchParams.get('run');
	const run = wanted ? await getRun(wanted) : (runs[0] ?? null);
	const summary = (r: (typeof runs)[number]) => ({
		id: r.id,
		started_at: r.started_at,
		finished_at: r.finished_at ?? null,
		status: effectiveStatus(r),
		version: r.version,
		passed: r.shots.filter((s) => s.ok).length,
		total: r.shots.length,
		planned: r.planned
	});
	return {
		runs: runs.map(summary),
		run: run ? { ...run, status: effectiveStatus(run) } : null,
		keep: KEEP_RUNS,
		pages: testPages.length,
		chrome: !!findChrome(),
		evalsUrl: business.showcase.evalsUrl,
		sourceUrl: business.showcase.sourceUrl
	};
};
