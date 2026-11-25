<script lang="ts">
	import type { Maker } from '#lib/agent-demo.ts';
	import CodeBlock from './CodeBlock.svelte';

	// Each AI maker's assistants: how a person connects LessPane, the developer routes, and what has been checked.
	let { makers, selected = $bindable() }: { makers: Maker[]; selected: string } = $props();
	const m = $derived(makers.find((x) => x.id === selected) ?? makers[0]);
</script>

<div class="tabs" role="tablist" aria-label="AI makers">
	{#each makers as x (x.id)}
		<button role="tab" id="maker-{x.id}" aria-selected={m.id === x.id} aria-controls="maker-panel" onclick={() => (selected = x.id)}>
			<strong>{x.assistant}</strong>
			<span>{x.maker}</span>
		</button>
	{/each}
</div>

<div class="panel card" id="maker-panel" role="tabpanel" aria-labelledby="maker-{m.id}">
	{#if m.app}
		<section>
			<h3>In {m.app.name}</h3>
			<ol>
				{#each m.app.steps as s, i (i)}<li>{s}</li>{/each}
			</ol>
			{#if m.app.note}<p class="muted note">{m.app.note}</p>{/if}
		</section>
	{/if}
	{#if m.snippets.length}
		<section>
			<h3>{m.app ? 'For developers' : 'Connect any client'}</h3>
			<div class="snippets">
				{#each m.snippets as s (s.title)}<CodeBlock label={s.title} code={s.code} />{/each}
			</div>
		</section>
	{/if}
	<section class="checked">
		<h3>What has been checked</h3>
		<p>{m.checked}</p>
	</section>
	<p class="docs">
		Current instructions from {m.maker === 'Anyone' ? 'the protocol' : m.maker}:
		{#each m.docs as d, i (d.url)}{#if i}, {/if}<a href={d.url} rel="noopener">{d.label}</a>{/each}.
	</p>
</div>

<style>
	.tabs {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 10px;
	}

	.tabs button {
		display: grid;
		padding: 6px 14px;
		border: 1.5px solid var(--line);
		border-radius: 12px;
		background: var(--paper);
		color: var(--ink);
		font: inherit;
		text-align: left;
		line-height: 1.2;
		cursor: pointer;
	}

	.tabs button span {
		font-size: 0.78rem;
		color: var(--ink-soft);
	}

	.tabs button[aria-selected='true'] {
		border-color: var(--ink);
		background: var(--highlight);
	}

	.panel {
		display: grid;
		gap: 14px;
		min-width: 0;
	}

	h3 {
		margin: 0 0 6px;
		font-size: 1.15rem;
	}

	ol {
		margin: 0;
		padding-left: 22px;
		display: grid;
		gap: 4px;
		overflow-wrap: anywhere;
	}

	.note {
		margin: 6px 0 0;
		font-size: 0.88rem;
	}

	.snippets {
		display: grid;
		gap: 12px;
	}

	.checked {
		padding: 10px 12px;
		border: 1.5px dashed var(--line);
		border-radius: 10px;
	}

	.checked p {
		margin: 0;
		color: var(--ink-soft);
	}

	.docs {
		margin: 0;
		font-size: 0.88rem;
	}
</style>
