<script lang="ts">
	import { timeWindowLabels } from '$lib/config';
	import { formatUsd } from '$lib/pricing';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const prettyDate = (iso: string) =>
		new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});
</script>

<svelte:head>
	<title>Request sent · LessPane</title>
</svelte:head>

<section class="card stack">
	<p class="check" aria-hidden="true">✓</p>
	{#if data.summary}
		<h1>Thanks, {data.summary.firstName}. You're on the list.</h1>
		<p>
			We got your request for <strong>{prettyDate(data.summary.date)}</strong>,
			{timeWindowLabels[data.summary.window].toLowerCase()}, at
			<strong>{formatUsd(data.summary.total)}</strong>.
		</p>
		<p class="muted">
			A copy is on its way to {data.summary.email}. We'll text you to confirm the exact time.
		</p>
		{#if data.manageUrl}
			<a class="btn block ghost" href={data.manageUrl}>Change the day or cancel</a>
			<p class="muted small">The same private link is in your email. No account needed.</p>
		{/if}
	{:else}
		<h1>Request received</h1>
		<p class="muted">We'll text you to confirm the exact time.</p>
	{/if}
	<a class="btn ghost block" href="/">Start another house</a>
</section>

<style>
	.small {
		margin: 0;
		font-size: 0.85rem;
		text-align: center;
	}

	.check {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		margin: 0;
		font-size: 1.8rem;
		font-weight: 800;
		color: var(--brand-ink);
		background: var(--brand);
	}
</style>
