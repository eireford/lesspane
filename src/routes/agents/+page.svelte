<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import type { PageData } from './$types';

	// For AI agents (and the people curious about them): how to order from LessPane. Same text as /llms.txt.
	let { data }: { data: PageData } = $props();
	const g = $derived(data.guide);
</script>

<svelte:head>
	<title>Ordering by AI agent · LessPane</title>
	<meta name="description" content="How an AI assistant can price and book a LessPane window cleaning for its person: MCP, an HTTP API or the website." />
	<link rel="alternate" type="text/markdown" href="/llms.txt" />
</svelte:head>

<section class="intro">
	<p class="step">For AI agents</p>
	<h1>Order a window cleaning for your person</h1>
	<p>{g.intro}</p>
	{#if g.demo}<p class="demo" role="note"><Icon name="info" size={18} /> <strong>{g.demo}</strong></p>{/if}
</section>

<section aria-labelledby="doors">
	<h2 id="doors">How to reach us</h2>
	<ul class="doors">
		{#each g.doors as d (d.name)}
			<li><strong>{d.name}</strong> <code>{d.url}</code><br /><span class="muted">{d.note}</span></li>
		{/each}
	</ul>
</section>

<section aria-labelledby="steps">
	<h2 id="steps">How to order</h2>
	<ol class="steps">
		{#each g.steps as s (s)}<li>{s}</li>{/each}
	</ol>
</section>

<section aria-labelledby="packages">
	<h2 id="packages">Packages</h2>
	<ul>
		{#each g.packages as p (p)}<li>{p}</li>{/each}
	</ul>
</section>

<section aria-labelledby="know">
	<h2 id="know">Good to know</h2>
	<dl>
		<dt>Payment</dt><dd>{g.payment}</dd>
		<dt>Changes</dt><dd>{g.changes}</dd>
		<dt>Not offered</dt><dd>{g.notOffered}</dd>
		<dt>Limits</dt><dd>{g.limits}</dd>
		<dt>Contact</dt><dd><a href="mailto:{g.contact}">{g.contact}</a></dd>
	</dl>
	<p class="muted">Also as plain text: <a href="/llms.txt">/llms.txt</a> · API description: <a href="/openapi.json">/openapi.json</a></p>
</section>

<style>
	section + section {
		margin-top: 24px;
	}

	h1 {
		margin: 0 0 8px;
		font-size: clamp(1.8rem, 7vw, 2.3rem);
		line-height: 1.05;
	}

	h2 {
		font-size: 1.5rem;
	}

	.intro p {
		margin: 0 0 10px;
	}

	.demo {
		display: flex;
		gap: 8px;
		padding: 10px 12px;
		border: 1.5px dashed var(--accent);
		border-radius: var(--sketchy);
	}

	.doors {
		padding-left: 20px;
		display: grid;
		gap: 10px;
	}

	code {
		font-size: 0.88rem;
		overflow-wrap: anywhere;
	}

	.steps {
		display: grid;
		gap: 8px;
		padding-left: 22px;
	}

	dl {
		display: grid;
		gap: 4px;
		margin: 0;
	}

	dt {
		font-weight: 650;
		margin-top: 6px;
	}

	dd {
		margin: 0;
		color: var(--ink-soft);
	}
</style>
