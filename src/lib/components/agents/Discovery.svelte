<script lang="ts">
	import { mcp } from '#lib/agent-client.ts';
	import { discovery, type DiscoveryId } from '#lib/agent-demo.ts';
	import CodeBlock from './CodeBlock.svelte';

	// How an agent finds LessPane: each way in, with its real content fetched live from this site.
	let selected = $state<DiscoveryId>('search');
	const d = $derived(discovery.find((x) => x.id === selected)!);
	let output = $state<Record<string, { request: string; text: string; summary?: string[] }>>({});
	let busy = $state(false);
	let failed = $state('');

	async function fetchLive() {
		busy = true;
		failed = '';
		try {
			if (d.live === 'jsonld') {
				const html = await (await fetch('/')).text();
				const doc = new DOMParser().parseFromString(html, 'text/html');
				const data = JSON.parse(doc.querySelector('script[type="application/ld+json"]')?.textContent ?? 'null');
				output[d.id] = {
					request: 'GET /  (then read <script type="application/ld+json">)',
					text: JSON.stringify(data, null, 2),
					summary: data ? [`${data['@type']}: ${data.name}`, `${data.areaServed?.length} counties`, ...(data.makesOffer ?? []).map((o: any) => `${o.name}: $${o.price}`)] : ['No structured data found.']
				};
			} else if (d.live === 'text') {
				output[d.id] = { request: `GET ${d.path}`, text: await (await fetch(d.path!)).text() };
			} else if (d.live === 'openapi') {
				const spec = await (await fetch(d.path!)).json();
				const ops = Object.entries(spec.paths ?? {}).flatMap(([p, methods]) =>
					Object.entries(methods as Record<string, any>).map(([m, op]) => `${m.toUpperCase()} ${spec.servers?.[0]?.url ?? ''}${p}  ${op.summary ?? op.operationId}`)
				);
				output[d.id] = { request: `GET ${d.path}`, text: JSON.stringify(spec, null, 2), summary: [`OpenAPI ${spec.openapi}: ${spec.info?.title}`, ...ops] };
			} else if (d.live === 'mcp') {
				const init = await mcp('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'lesspane-agents-demo', version: '1' } });
				const list = await mcp('tools/list');
				const r = init.result as any;
				const tools = ((list.body as any)?.result?.tools ?? []) as any[];
				output[d.id] = {
					request: `${init.request}\n\n…then\n\n${list.request}`,
					text: JSON.stringify({ initialize: init.body, 'tools/list': list.body }, null, 2),
					summary: [
						`Server: ${r?.serverInfo?.title ?? r?.serverInfo?.name} ${r?.serverInfo?.version ?? ''}, protocol ${r?.protocolVersion}`,
						...tools.map((t) => `${t.name}${t.annotations?.readOnlyHint ? ' (read-only)' : ''}: ${t.title ?? ''}`)
					]
				};
			}
		} catch (e) {
			failed = `Could not fetch it: ${e instanceof Error ? e.message : e}`;
		} finally {
			busy = false;
		}
	}
</script>

<div class="explorer">
	<div class="tabs" role="tablist" aria-label="Ways an agent finds LessPane">
		{#each discovery as x (x.id)}
			<button role="tab" id="disc-{x.id}" aria-selected={selected === x.id} aria-controls="disc-panel" onclick={() => (selected = x.id)}>
				{x.name}
			</button>
		{/each}
	</div>

	<div class="panel card" id="disc-panel" role="tabpanel" aria-labelledby="disc-{d.id}">
		<h3>{d.name}</h3>
		<dl>
			<dt>Who comes this way</dt>
			<dd>{d.who}</dd>
			<dt>What it finds</dt>
			<dd>{d.what}</dd>
		</dl>
		{#if d.path}
			<p class="actions">
				<a href={d.path} target="_blank" rel="noopener"><code>{d.path}</code></a>
				{#if d.live}
					<button class="btn ghost" onclick={fetchLive} disabled={busy}>{busy ? 'Fetching…' : output[d.id] ? 'Fetch again' : 'Fetch it live'}</button>
				{/if}
			</p>
		{/if}
		{#if failed}<p class="error" role="alert">{failed}</p>{/if}
		{#if output[d.id]}
			{@const o = output[d.id]}
			<CodeBlock label="The request" code={o.request} maxHeight="160px" />
			{#if o.summary}
				<p class="label">What an agent learns from it</p>
				<ul class="summary">
					{#each o.summary as line, i (i)}<li>{line}</li>{/each}
				</ul>
			{/if}
			<details open={!o.summary}>
				<summary>The full answer</summary>
				<CodeBlock code={o.text} maxHeight="360px" />
			</details>
		{/if}
	</div>
</div>

<style>
	.explorer {
		display: grid;
		gap: 12px;
	}

	@media (min-width: 760px) {
		.explorer {
			grid-template-columns: 210px 1fr;
			align-items: start;
		}
	}

	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	@media (min-width: 760px) {
		.tabs {
			flex-direction: column;
		}
	}

	.tabs button {
		padding: 8px 12px;
		border: 1.5px solid var(--line);
		border-radius: 10px;
		background: var(--paper);
		color: var(--ink);
		font: inherit;
		font-size: 0.92rem;
		text-align: left;
		cursor: pointer;
	}

	.tabs button[aria-selected='true'] {
		border-color: var(--ink);
		background: var(--highlight);
		font-weight: 650;
	}

	.panel {
		display: grid;
		gap: 10px;
		min-width: 0;
	}

	h3 {
		margin: 0;
		font-size: 1.25rem;
	}

	dl {
		margin: 0;
		display: grid;
		gap: 2px;
	}

	dt {
		font-weight: 650;
		font-size: 0.88rem;
	}

	dd {
		margin: 0 0 6px;
		color: var(--ink-soft);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		margin: 0;
	}

	.label {
		margin: 0;
		font-size: 0.82rem;
		font-weight: 650;
		color: var(--ink-soft);
	}

	.summary {
		margin: 0;
		padding-left: 18px;
		font-size: 0.9rem;
		font-family: ui-monospace, monospace;
		overflow-wrap: anywhere;
	}

	details summary {
		cursor: pointer;
		font-size: 0.9rem;
		margin-bottom: 6px;
	}

	.error {
		color: var(--danger);
		margin: 0;
	}
</style>
