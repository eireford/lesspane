<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '#lib/components/Icon.svelte';
	import { business, pricing, serviceLabels, timeWindowLabels } from '#lib/config.ts';
	import { formatUsd } from '#lib/pricing.ts';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	const r = $derived(data.request);
	let busy = $state(false);

	const prettyDate = (iso: string) =>
		new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
</script>

<svelte:head>
	<title>Confirm your window cleaning · LessPane</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<section class="card stack">
	<p class="step">From your AI assistant</p>
	{#if r.status === 'awaiting_customer'}
		<h1>Did you ask for this{r.firstName ? `, ${r.firstName}` : ''}?</h1>
		<p>
			<strong>{r.agent}</strong> asked us to clean your windows. Nothing is booked until you say yes.
		</p>
	{:else if r.status === 'cancelled' && r.reason === 'declined'}
		<h1>Cancelled. Thanks for telling us.</h1>
		<p class="muted">Nothing is booked, and we won't contact you about it.</p>
	{:else if r.status === 'cancelled' && r.reason === 'expired'}
		<h1>This request lapsed</h1>
		<p class="muted">It wasn't confirmed in time, so nothing is booked. Ask your assistant again, or start on our site.</p>
	{:else if r.status === 'cancelled'}
		<h1>This request is cancelled</h1>
	{:else}
		<h1>Confirmed. You're on the list.</h1>
		<p class="muted">
			{business.showcase.enabled
				? 'This is a demo, so no one will come to clean.'
				: "We'll be in touch to confirm the exact time, usually within one business day."}
		</p>
	{/if}

	<dl class="job">
		<dt><Icon name="calendar" size={18} /> When</dt>
		<dd>{prettyDate(r.date)}, {timeWindowLabels[r.window].toLowerCase()}</dd>
		<dt><Icon name="home" size={18} /> Home</dt>
		<dd>
			{r.stories}-story, about {r.windows} windows · {serviceLabels[r.service]}{r.addons.length
				? ` · ${r.addons.map((a) => pricing.addOns[a].label).join(', ')}`
				: ''}
		</dd>
		{#if r.address}<dt><Icon name="pin" size={18} /> Where</dt><dd>{r.address}</dd>{/if}
		<dt><Icon name="sparkle" size={18} /> Price</dt>
		<dd><strong>{formatUsd(r.total)}</strong>, paid after the job</dd>
	</dl>

	{#if r.status === 'awaiting_customer'}
		<div class="answers">
			<form method="POST" action="?/confirm" use:enhance={() => { busy = true; return async ({ update }) => { await update(); busy = false; }; }}>
				<button class="btn block" type="submit" disabled={busy}><Icon name="check" size={20} /> Yes, book it</button>
			</form>
			<form method="POST" action="?/decline" use:enhance={() => { busy = true; return async ({ update }) => { await update(); busy = false; }; }}>
				<button class="btn ghost block" type="submit" disabled={busy}>No, this wasn't me</button>
			</form>
		</div>
		{#if business.showcase.enabled}<p class="muted small">This is a demo: even if you confirm, no one will come to clean.</p>{/if}
	{:else if r.manageUrl}
		<a class="btn ghost block" href={r.manageUrl}>Change the day or cancel</a>
	{/if}
	{#if form?.answered}<p class="sr-only" role="status">{form.answered === 'confirmed' ? 'Confirmed.' : 'Cancelled.'}</p>{/if}
</section>

<style>
	h1 {
		margin: 0;
		font-size: 2rem;
	}

	.job {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 8px 14px;
		margin: 0;
		padding: 14px;
		border: 1.5px dashed var(--line);
		border-radius: var(--sketchy);
	}

	dt {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--ink-soft);
	}

	dd {
		margin: 0;
	}

	.answers {
		display: grid;
		gap: 10px;
	}

	.small {
		margin: 0;
		font-size: 0.85rem;
		text-align: center;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
</style>
