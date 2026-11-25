<script lang="ts">
	import { goto, refreshAll } from '$app/navigation';
	import Icon from '#lib/components/Icon.svelte';
	import type { PageData } from './$types';

	type Run = NonNullable<PageData['run']>;
	type Shot = Run['shots'][number];

	let { data }: { data: PageData } = $props();

	// ---------- Starting a run, with live progress ----------

	let running = $state(false);
	let live = $state<{ id: string; planned: number; shots: Shot[]; pruned: number } | null>(null);
	let startError = $state('');

	async function start() {
		running = true;
		startError = '';
		live = null;
		let runId = '';
		try {
			const res = await fetch('/admin/tests/run', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
			if (!res.ok || !res.body) {
				startError = (await res.json().catch(() => null))?.error ?? `The server said ${res.status}.`;
				return;
			}
			const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
			let buffer = '';
			for (;;) {
				const { value, done } = await reader.read();
				if (done) break;
				buffer += value;
				let nl: number;
				while ((nl = buffer.indexOf('\n')) >= 0) {
					const event = JSON.parse(buffer.slice(0, nl));
					buffer = buffer.slice(nl + 1);
					if (event.type === 'start') {
						runId = event.run.id;
						live = { id: runId, planned: event.run.planned, shots: [], pruned: event.pruned.length };
					} else if (event.type === 'shot' && live) {
						live.shots.push(event.shot);
					} else if (event.type === 'error') {
						startError = event.message;
					}
				}
			}
		} catch (e) {
			startError = `Lost touch with the run (${e instanceof Error ? e.message : e}). It may still finish; reload in a minute.`;
		} finally {
			running = false;
			if (runId) await goto(`?run=${runId}`, { refreshAll: true, reset: false });
			else await refreshAll();
			// The finished run is now in the list and shown below.
			if (!startError) live = null;
		}
	}

	// ---------- Viewing a run ----------

	let only = $state<'all' | 'phone' | 'desktop'>('all');
	let problemsOnly = $state(false);
	let open = $state<Shot | null>(null);
	let dialog = $state<HTMLDialogElement>();

	const groups = $derived.by(() => {
		const run = data.run;
		if (!run) return [];
		const byPath = new Map<string, Shot[]>();
		for (const s of run.shots) byPath.set(s.path, [...(byPath.get(s.path) ?? []), s]);
		return [...byPath.values()]
			.map((shots) => shots.filter((s) => only === 'all' || s.viewport === only))
			.filter((shots) => shots.length && (!problemsOnly || shots.some((s) => !s.ok || s.problems.length)));
	});

	const shotUrl = (s: Shot) => `/admin/tests/shot/${data.run?.id}/${s.index}`;
	const when = (iso: string) =>
		new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
	const seconds = (a: string, b: string | null) => (b ? `${Math.round((Date.parse(b) - Date.parse(a)) / 1000)} s` : '');
	const statusText: Record<string, string> = { running: 'Running', passed: 'Passed', failed: 'Failed', error: 'Error', interrupted: 'Interrupted' };

	function show(s: Shot) {
		open = s;
		dialog?.showModal();
	}
</script>

<svelte:head>
	<title>Tests · LessPane admin</title>
</svelte:head>

<div class="wide">
<h1>Tests</h1>
<p class="lead">
	The <strong>screenshot test</strong> opens every page of the site ({data.pages} of them) in a real browser at phone and
	desktop size, and keeps a full-page screenshot of each. A page fails if it answers with the wrong status or throws a
	script error. The last {data.keep} runs are kept; starting a run deletes the older ones.
</p>

<div class="runbar">
	<button class="btn" onclick={start} disabled={running || !data.chrome}>
		<Icon name="window" size={20} />
		{running ? 'Running…' : 'Run the screenshot test'}
	</button>
	{#if !data.chrome}<span class="muted">No browser on this server, so tests can't run here.</span>{/if}
	{#if startError}<p class="error" role="alert">{startError}</p>{/if}
</div>

{#if live}
	<section class="live card" aria-live="polite">
		<p>
			<strong>{live.shots.length} of {live.planned}</strong> screenshots
			{#if live.pruned}· {live.pruned} old {live.pruned === 1 ? 'run' : 'runs'} deleted{/if}
		</p>
		<progress max={live.planned} value={live.shots.length}></progress>
		<ol class="ticker">
			{#each live.shots.slice(-6) as s (s.index)}
				<li class:bad={!s.ok}>
					<Icon name={s.ok ? 'check' : 'x'} size={16} />
					{s.label} <span class="muted">· {s.viewport} · {(s.ms / 1000).toFixed(1)} s</span>
				</li>
			{/each}
		</ol>
	</section>
{/if}

<section aria-labelledby="runs-h">
	<h2 id="runs-h">Last runs</h2>
	{#if data.runs.length}
		<ul class="runs">
			{#each data.runs as r (r.id)}
				<li>
					<a href="?run={r.id}" aria-current={data.run?.id === r.id ? 'true' : undefined} data-sveltekit-noscroll>
						<span class="badge {r.status}">{statusText[r.status]}</span>
						<span>{when(r.started_at)}</span>
						<span class="muted">{r.passed}/{r.planned} ok · v{r.version}{r.finished_at ? ` · ${seconds(r.started_at, r.finished_at)}` : ''}</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="muted">No runs yet.</p>
	{/if}
</section>

{#if data.run}
	{@const run = data.run}
	<section aria-labelledby="run-h" class="run">
		<h2 id="run-h">
			<span class="badge {run.status}">{statusText[run.status]}</span>
			Run of {when(run.started_at)}
		</h2>
		<p class="muted">
			{run.shots.filter((s) => s.ok).length} of {run.planned} screenshots ok · version {run.version} · {run.origin} · started by {run.by}
			{#if run.finished_at}· took {seconds(run.started_at, run.finished_at)}{/if}
		</p>
		{#if run.message}<p class="note">{run.message}</p>{/if}

		<div class="filters" role="group" aria-label="Show">
			{#each [['all', 'Both sizes'], ['phone', 'Phone'], ['desktop', 'Desktop']] as [v, label] (v)}
				<button class="chip" aria-pressed={only === v} onclick={() => (only = v as typeof only)}>{label}</button>
			{/each}
			<label class="chip"><input type="checkbox" bind:checked={problemsOnly} /> Problems only</label>
		</div>

		<div class="pages">
			{#each groups as shots (shots[0].path)}
				<article class="page card">
					<header>
						<h3>{shots[0].label}</h3>
						<a class="path" href={shots[0].path} target="_blank" rel="noopener">{shots[0].path.length > 40 ? shots[0].path.slice(0, 40) + '…' : shots[0].path}</a>
					</header>
					<div class="thumbs">
						{#each shots as s (s.index)}
							<figure class={s.viewport}>
								{#if s.bytes}
									<button class="thumb" onclick={() => show(s)} aria-label="Open the {s.viewport} screenshot of {s.label}">
										<img src={shotUrl(s)} alt="" loading="lazy" width={s.width} height={s.height} />
									</button>
								{:else}
									<div class="thumb empty">No screenshot</div>
								{/if}
								<figcaption>
									<span class="badge {s.ok ? 'passed' : 'failed'}">{s.ok ? 'OK' : 'Fail'}</span>
									{s.viewport} · {s.status ?? '—'} · {(s.ms / 1000).toFixed(1)} s
									{#if s.problems.length}
										<ul class="problems">
											{#each s.problems as p, i (i)}<li class:note={p.startsWith('Note:')}>{p}</li>{/each}
										</ul>
									{/if}
								</figcaption>
							</figure>
						{/each}
					</div>
				</article>
			{:else}
				<p class="muted">{problemsOnly ? 'No problems in this run.' : 'No screenshots in this run.'}</p>
			{/each}
		</div>
	</section>
{/if}

<section aria-labelledby="other-h" class="other">
	<h2 id="other-h">The other tests</h2>
	<ul>
		<li><strong>Unit tests</strong> (pricing, validation, the AI tools, the agent API): run on every push before staging deploys.</li>
		<li>
			<strong>Browser smoke tests</strong>: <code>npm run smoke</code> swipes and taps through a quote and books;
			<code>npm run smoke:agent</code> orders as an outside AI agent would.
		</li>
		<li>
			<strong>AI evals</strong>: the chat assistant's answers and an outside agent's orders, checked against the real
			pricing code. <a href={data.evalsUrl}>The eval suites on GitHub</a>.
		</li>
	</ul>
	<p class="muted">All of it is in <a href={data.sourceUrl}>the source</a>.</p>
</section>
</div>

<dialog bind:this={dialog} onclose={() => (open = null)} class="viewer" aria-label="Screenshot">
	{#if open}
		<header>
			<p><strong>{open.label}</strong> · {open.viewport} · {open.width}×{open.height}px</p>
			<a href={shotUrl(open)} target="_blank" rel="noopener">Open the image</a>
			<button class="btn ghost" onclick={() => dialog?.close()} aria-label="Close"><Icon name="x" size={20} /></button>
		</header>
		<div class="scroller">
			<!-- Phone screenshots are taken at 2×; shown at the phone's own width. -->
			<img src={shotUrl(open)} alt="{open.viewport} screenshot of {open.label}" style:width="{open.viewport === 'phone' ? open.width / 2 : open.width}px" />
		</div>
	{/if}
</dialog>

<style>
	h1 {
		margin: 0 0 6px;
	}

	h2 {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 1.4rem;
		margin: 24px 0 8px;
	}

	.lead {
		margin: 0 0 14px;
		color: var(--ink-soft);
		max-width: 70ch;
	}

	.runbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
	}

	.error {
		margin: 0;
		color: var(--danger);
		font-weight: 600;
	}

	.live {
		margin-top: 14px;
	}

	.live p {
		margin: 0 0 6px;
	}

	progress {
		width: 100%;
		accent-color: var(--brand);
	}

	.ticker {
		margin: 8px 0 0;
		padding: 0;
		list-style: none;
		font-size: 0.9rem;
	}

	.ticker li {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--brand);
	}

	.ticker li.bad {
		color: var(--danger);
	}

	.runs {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 4px;
	}

	.runs a {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 10px;
		padding: 6px 10px;
		border: 1.5px solid var(--line);
		border-radius: 10px;
		color: var(--ink);
		text-decoration: none;
	}

	.runs a[aria-current='true'] {
		border-color: var(--ink);
		background: var(--highlight);
	}

	.badge {
		display: inline-block;
		padding: 1px 8px;
		border-radius: 999px;
		font-size: 0.8rem;
		font-weight: 700;
		background: var(--line);
		color: var(--ink);
	}

	.badge.passed {
		background: var(--brand-soft);
		color: #1d5e45;
	}

	.badge.failed,
	.badge.error {
		background: #f7d9d2;
		color: var(--danger);
	}

	.badge.running {
		background: var(--glass);
	}

	.note {
		color: var(--ink-soft);
		font-style: italic;
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 8px 0 14px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 36px;
		padding: 4px 14px;
		border: 1.5px solid var(--line);
		border-radius: 999px;
		background: var(--paper);
		color: var(--ink);
		font: inherit;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.chip[aria-pressed='true'] {
		border-color: var(--ink);
		background: var(--highlight);
	}

	.pages {
		display: grid;
		gap: 14px;
	}

	.page header {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 12px;
		margin-bottom: 8px;
	}

	.page h3 {
		margin: 0;
		font-size: 1.15rem;
	}

	.path {
		font-family: ui-monospace, monospace;
		font-size: 0.82rem;
		overflow-wrap: anywhere;
	}

	.thumbs {
		display: flex;
		flex-wrap: wrap;
		gap: 14px;
		align-items: flex-start;
	}

	figure {
		margin: 0;
		display: grid;
		gap: 4px;
	}

	figure.phone {
		width: 150px;
	}

	figure.desktop {
		width: min(100%, 420px);
	}

	.thumb {
		display: block;
		width: 100%;
		height: 280px;
		padding: 0;
		overflow: hidden;
		border: 1.5px solid var(--ink);
		border-radius: 8px;
		background: var(--paper);
		cursor: zoom-in;
	}

	.thumb img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: top;
	}

	.thumb.empty {
		display: grid;
		place-items: center;
		color: var(--ink-soft);
		cursor: default;
	}

	figcaption {
		font-size: 0.82rem;
		color: var(--ink-soft);
	}

	.problems {
		margin: 0;
		padding-left: 16px;
		font-size: 0.82rem;
		color: var(--danger);
	}

	.problems li.note {
		color: var(--ink-soft);
	}

	.other ul {
		padding-left: 20px;
		display: grid;
		gap: 6px;
	}

	.viewer {
		width: min(96vw, 1320px);
		max-height: 94vh;
		padding: 0;
		border: 2px solid var(--ink);
		border-radius: 12px;
	}

	.viewer::backdrop {
		background: rgb(43 42 38 / 0.55);
	}

	.viewer header {
		position: sticky;
		top: 0;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 8px 12px;
		background: var(--paper);
		border-bottom: 1px solid var(--line);
	}

	.viewer header p {
		margin: 0;
		flex: 1;
	}

	.scroller {
		max-height: calc(94vh - 60px);
		overflow: auto;
		background: #eee;
	}

	.scroller img {
		display: block;
		max-width: 100%;
		margin: 0 auto;
	}
</style>
