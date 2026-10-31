<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import LayoutSketch from '$lib/components/LayoutSketch.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import SketchDefs from '$lib/components/SketchDefs.svelte';
	import SunDial from '$lib/components/SunDial.svelte';
	import type { AddOnKey, TimeWindow } from '$lib/config';
	import { layoutToSearchParams } from '$lib/layout';
	import { formatUsd } from '$lib/pricing';
	import { addDaysIso } from '$lib/validation';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	/** A few days out, skipping Sunday. */
	function firstGoodDay(min: string) {
		let d = addDaysIso(min, 2);
		if (new Date(`${d}T12:00:00`).getDay() === 0) d = addDaysIso(d, 1);
		return d;
	}

	const errors = $derived((form?.errors ?? {}) as Record<string, string>);
	const values = $derived((form?.values ?? {}) as Partial<Record<string, string>>);
	const layoutFields = $derived([...layoutToSearchParams(data.layout)]);
	const addOnIcons: Record<AddOnKey, IconName> = { screens: 'mesh', tracks: 'track', hard_water: 'drop' };

	// Starts a few days out, in the morning; a failed submit keeps what was picked.
	let date = $state(untrack(() => values.preferredDate || firstGoodDay(data.dateRange.min)));
	let time = $state<TimeWindow>(untrack(() => (values.preferredWindow as TimeWindow) || 'morning'));
	let submitting = $state(false);
</script>

<svelte:head>
	<title>LessPane · Pick a time</title>
</svelte:head>

<SketchDefs />

<!-- What's being booked, with a way back to change it -->
<section class="summary">
	<a class="back" href={data.back} aria-label="Change the job"><Icon name="left" /></a>
	<div class="mini" aria-hidden="true">
		<LayoutSketch layout={data.layout} mode="floors" />
	</div>
	<div class="what">
		<small class="tag">Your estimate</small>
		<p class="amount">{formatUsd(data.quote.total)}</p>
		<p class="parts" aria-label={`${data.job.windows} windows`}>
			<Icon name="window" size={16} />{data.job.windows}
			{#if data.job.service === 'interior_exterior'}<Icon name="hand" size={16} />{/if}
			{#each data.job.addons as a (a)}<Icon name={addOnIcons[a]} size={16} />{/each}
		</p>
	</div>
</section>

<form
	method="POST"
	class="stack"
	novalidate
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update({ reset: false });
			submitting = false;
		};
	}}
>
	{#if form?.message}
		<p class="alert" role="alert">{form.message}</p>
	{/if}

	<!-- When: pick a day, drag the sun -->
	<section class="play" aria-label="When: pick a day and drag the sun">
		<p class="cue"><Icon name="calendar" size={18} /><span class="label">When</span><span class="hint">pick a day, drag the sun ☀</span></p>
		<SunDial min={data.dateRange.min} max={data.dateRange.max} bind:date bind:time />
		{#if errors.preferredDate}<p class="error">{errors.preferredDate}</p>{/if}
	</section>

	<!-- The job from the quote steps; the server re-validates it and re-prices it from the layout -->
	{#each layoutFields as [name, value]}<input type="hidden" {name} {value} />{/each}
	<input type="hidden" name="service" value={data.job.service} />
	{#each data.job.addons as addon}<input type="hidden" name="addons" value={addon} />{/each}
	<input type="hidden" name="preferredDate" value={date} />
	<input type="hidden" name="preferredWindow" value={time} />

	<div class="honeypot" aria-hidden="true">
		<label for="company">Company</label>
		<input id="company" name="company" type="text" tabindex="-1" autocomplete="off" />
	</div>

	{#snippet field(id: string, icon: IconName, label: string, attrs: Record<string, unknown>)}
		<div>
			<label class="field" class:bad={!!errors[id]}>
				<Icon name={icon} size={20} />
				<span class="sr">{label}</span>
				<input {id} name={id} placeholder={label} value={values[id] ?? ''} aria-invalid={!!errors[id]} {...attrs} />
			</label>
			{#if errors[id]}<p class="error">{errors[id]}</p>{/if}
		</div>
	{/snippet}

	<section class="card who" aria-label="Where and who">
		<div class="stack">
			<p class="cue"><Icon name="pin" size={18} /><span class="label">Where and who</span></p>
			<div class="row addr">
				{@render field('address', 'pin', 'Street address', { type: 'text', autocomplete: 'street-address', required: true })}
				{@render field('zip', 'home', 'ZIP', { type: 'text', inputmode: 'numeric', autocomplete: 'postal-code', maxlength: 5, required: true })}
			</div>
			{@render field('name', 'user', 'Name', { type: 'text', autocomplete: 'name', required: true })}
			<div class="row">
				{@render field('phone', 'phone', 'Mobile', { type: 'tel', autocomplete: 'tel', required: true })}
				{@render field('email', 'mail', 'Email', { type: 'email', autocomplete: 'email', required: true })}
			</div>

			<button class="btn block send" type="submit" disabled={submitting} aria-label={`Request my visit, ${formatUsd(data.quote.total)}`}>
				{#if submitting}…{:else}<Icon name="check" /> Request my visit · {formatUsd(data.quote.total)}{/if}
			</button>
			<p class="fine muted">No payment now · we text to confirm</p>
		</div>
	</section>
</form>

<style>
	.summary {
		display: grid;
		grid-template-columns: auto 120px 1fr;
		align-items: center;
		gap: 14px;
		margin-bottom: 22px;
	}

	.back {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		color: var(--ink);
	}

	.mini {
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		overflow: hidden;
	}

	.amount {
		display: inline-block;
		margin: 0;
		font-family: var(--hand);
		font-size: 2.4rem;
		line-height: 1;
		color: var(--brand);
		/* Highlighter swipe under the price */
		padding: 0 4px;
		background: linear-gradient(transparent 55%, var(--highlight) 55%, var(--highlight) 92%, transparent 92%);
	}

	.parts {
		display: flex;
		align-items: center;
		gap: 3px;
		margin: 4px 0 0;
		color: var(--ink-soft);
		font-weight: 650;
	}

	.cue {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0 0 8px;
		color: var(--brand);
	}

	.label {
		font-family: var(--hand);
		font-size: 1.3rem;
		line-height: 1;
	}

	.hint {
		margin-left: auto;
		font-family: var(--hand);
		font-size: 1rem;
		color: var(--ink-soft);
	}

	.tag {
		display: block;
		font-family: var(--hand);
		font-size: 0.95rem;
		color: var(--ink-soft);
	}

	.who {
		margin-top: 22px;
	}

	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	.field {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0;
		padding-left: 12px;
		font-weight: 400;
		color: var(--ink-soft);
		background: var(--paper);
		border: 1.5px solid var(--ink);
		border-radius: var(--sketchy);
	}

	.field.bad {
		border-color: var(--danger);
	}

	.field:focus-within {
		border-color: var(--brand);
		outline: 3px solid color-mix(in srgb, var(--brand) 25%, transparent);
	}

	.field input {
		border: 0;
		background: transparent;
		padding-left: 0;
		outline: none;
	}

	.row.addr {
		grid-template-columns: 2fr 1fr;
	}

	.send {
		min-height: 56px;
	}

	.fine {
		margin: 0;
		font-size: 0.85rem;
		text-align: center;
	}

	@media (max-width: 420px) {
		.row,
		.row.addr {
			grid-template-columns: 1fr;
		}
	}
</style>
