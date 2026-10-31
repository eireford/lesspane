<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import SketchDefs from '$lib/components/SketchDefs.svelte';
	import SunDial from '$lib/components/SunDial.svelte';
	import { pricing, serviceLabels, timeWindowLabels, type TimeWindow } from '$lib/config';
	import { formatUsd } from '$lib/pricing';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const b = $derived(data.booking);
	const prettyDate = (iso: string) =>
		new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

	// The new time starts on the current one (or the first open day, if that's now out of range).
	let date = $state(untrack(() => (data.booking.date >= data.dateRange.min ? data.booking.date : data.dateRange.min)));
	let time = $state<TimeWindow>(untrack(() => data.booking.window));
	let confirmingCancel = $state(false);
	let busy = $state(false);

	const statusText: Record<string, string> = {
		new: 'Requested: we’ll text you to confirm the time',
		confirmed: 'Confirmed',
		done: 'Done. Thanks!',
		cancelled: 'Cancelled'
	};

	const submit = () => {
		busy = true;
		return async ({ update }: { update: () => Promise<void> }) => {
			await update();
			busy = false;
			confirmingCancel = false;
		};
	};
</script>

<svelte:head>
	<title>LessPane · Your booking</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<SketchDefs />

<h1 class="hello">Hi {b.firstName}, here’s your booking</h1>
<p class="why"><Icon name="info" size={16} /> This private link is your key: no account needed. Anyone with it can change the booking, so keep it to yourself.</p>

{#if form && 'done' in form}
	<p class="notice" role="status">
		<Icon name="check" size={18} />
		{form.done === 'cancelled' ? 'Cancelled. We’ve emailed you a confirmation.' : 'New time saved. We’ll text you to confirm it.'}
	</p>
{:else if form?.message}
	<p class="alert" role="alert">{form.message}</p>
{/if}

<section class="card booking">
	<p class="status" class:cancelled={b.status === 'cancelled'}>{statusText[b.status]}</p>
	<p class="when"><Icon name="calendar" size={20} /> {prettyDate(b.date)}, {timeWindowLabels[b.window].toLowerCase()}</p>
	<ul class="lines">
		<li><span><Icon name="pin" size={16} /> {b.address}</span></li>
		<li>
			<span><Icon name="window" size={16} /> {b.stories} floor{b.stories > 1 ? 's' : ''}, about {b.windows} windows · {serviceLabels[b.service].toLowerCase()}</span>
		</li>
		{#if b.addons.length}
			<li><span><Icon name="sparkle" size={16} /> {b.addons.map((a) => pricing.addOns[a].label).join(', ')}</span></li>
		{/if}
		{#if b.layout}<li class="layout"><span>{b.layout}</span></li>{/if}
		<li class="total"><span>Estimate</span><span class="amount">{formatUsd(b.total)}</span></li>
	</ul>
</section>

{#if data.changeable}
	<form method="POST" action="?/reschedule" class="change" use:enhance={submit}>
		<p class="cue"><Icon name="calendar" size={18} /><span class="label">Pick a new time</span><span class="hint">tap a day, drag the sun ☀</span></p>
		<SunDial min={data.dateRange.min} max={data.dateRange.max} bind:date bind:time />
		<input type="hidden" name="preferredDate" value={date} />
		<input type="hidden" name="preferredWindow" value={time} />
		<button class="btn block" type="submit" disabled={busy || (date === b.date && time === b.window)}>
			<Icon name="check" /> Save {prettyDate(date).split(',')[0]}, {time}
		</button>
	</form>

	<form method="POST" action="?/cancel" class="cancel" use:enhance={submit}>
		{#if confirmingCancel}
			<p class="why">Cancel this request? You can always start a new one.</p>
			<div class="row">
				<button type="button" class="btn ghost" onclick={() => (confirmingCancel = false)}>Keep it</button>
				<button type="submit" class="btn danger" disabled={busy}>Yes, cancel</button>
			</div>
		{:else}
			<button type="button" class="link" onclick={() => (confirmingCancel = true)}>Cancel this request</button>
		{/if}
	</form>
{:else if b.status !== 'cancelled' && b.status !== 'done'}
	<p class="why"><Icon name="info" size={16} /> It’s the day of the visit or later, so changes go through us: reply to your confirmation email.</p>
{/if}

<style>
	.hello {
		margin: 0 0 6px;
		font-size: clamp(1.7rem, 7vw, 2.2rem);
		line-height: 1.1;
	}

	.why {
		display: flex;
		align-items: flex-start;
		gap: 6px;
		margin: 0 0 14px;
		font-size: 0.92rem;
		color: var(--ink-soft);
	}

	.notice {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 14px;
		border: 2px solid var(--brand);
		border-radius: var(--sketchy);
		background: var(--brand-soft);
		color: var(--brand);
		font-family: var(--hand);
		font-size: 1.15rem;
	}

	.status {
		margin: 0;
		font-family: var(--hand);
		font-size: 1.1rem;
		color: var(--brand);
	}

	.status.cancelled {
		color: var(--danger);
	}

	.when {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 4px 0 10px;
		font-family: var(--hand);
		font-size: 1.5rem;
	}

	.lines li {
		align-items: center;
		gap: 10px;
	}

	.lines li span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.layout {
		font-size: 0.85rem;
		color: var(--ink-soft);
	}

	.total {
		border-bottom: 0;
		font-family: var(--hand);
		font-size: 1.2rem;
	}

	.amount {
		padding: 0 4px;
		font-size: 1.6rem;
		color: var(--brand);
		background: linear-gradient(transparent 55%, var(--highlight) 55%, var(--highlight) 92%, transparent 92%);
	}

	.change {
		margin-top: 24px;
		display: grid;
		gap: 12px;
	}

	.cue {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0;
		color: var(--lake);
	}

	.label {
		font-family: var(--hand);
		font-size: 1.3rem;
		line-height: 1;
		color: var(--ink);
	}

	.hint {
		margin-left: auto;
		font-family: var(--hand);
		color: var(--ink-soft);
	}

	.cancel {
		margin-top: 22px;
		text-align: center;
	}

	.link {
		border: 0;
		background: none;
		font-family: var(--hand);
		font-size: 1.1rem;
		color: var(--danger);
		text-decoration: underline;
		cursor: pointer;
	}

	.danger {
		background: var(--danger);
	}
</style>
