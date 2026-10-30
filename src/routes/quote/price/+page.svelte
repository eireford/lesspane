<script lang="ts">
	import { serviceLabels } from '$lib/config';
	import { formatUsd } from '$lib/pricing';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Your quote · LessPane</title>
</svelte:head>

<p class="step">Step 2 of 3</p>
<h1>Your price</h1>

<section class="card stack">
	<div>
		<p class="price">{formatUsd(data.quote.total)}</p>
		<p class="muted">
			{serviceLabels[data.details.service]} · {data.details.address}
		</p>
	</div>

	<ul class="lines">
		{#each data.quote.lines as line}
			<li><span>{line.label}</span><span>{formatUsd(line.amount)}</span></li>
		{/each}
	</ul>

	{#if data.quote.minimumApplied}
		<p class="muted">Our minimum job price applies to this visit.</p>
	{/if}

	<!-- Placeholder copy: replace with your real terms (what's included, when payment is due). -->
	<p class="muted">
		We'll confirm this price when we text you to set the time. If your window count is far off, we'll
		tell you before we start.
	</p>

	<div class="actions">
		<a class="btn block" href="/quote/book?{data.query}">Pick a time</a>
		<a class="btn ghost block" href="/quote?{data.query}">Edit details</a>
	</div>
</section>
