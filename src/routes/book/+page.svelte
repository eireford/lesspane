<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import LayoutSketch from '#lib/components/LayoutSketch.svelte';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import Journey from '#lib/components/Journey.svelte';
	import SketchDefs from '#lib/components/SketchDefs.svelte';
	import SunDial from '#lib/components/SunDial.svelte';
	import { business, serviceAreaZips, type AddOnKey, type TimeWindow } from '#lib/config.ts';
	import { suggestEmail } from '#lib/email-typo.ts';
	import { layoutToSearchParams } from '#lib/layout.ts';
	import { formatUsd } from '#lib/pricing.ts';
	import { addDaysIso } from '#lib/validation.ts';
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

	// Help before the request is sent: a likely email typo (the customer would never get the confirmation or the
	// change link), and a ZIP we don't serve, said as soon as it's typed instead of after the whole form.
	let emailSuggestion = $state<string | null>(null);
	let zipNote = $state<string | null>(null);
	function checkEmail(e: Event) {
		emailSuggestion = suggestEmail((e.currentTarget as HTMLInputElement).value);
	}
	function useSuggestion() {
		const input = document.getElementById('email') as HTMLInputElement | null;
		if (input && emailSuggestion) input.value = emailSuggestion;
		emailSuggestion = null;
		input?.focus();
	}
	function checkZip(e: Event) {
		const zip = (e.currentTarget as HTMLInputElement).value.trim();
		zipNote = /^\d{5}$/.test(zip) && !serviceAreaZips.has(zip) ? `Sorry, we don't serve ${zip} yet, so we can't book a visit there.` : null;
	}
</script>

<svelte:head>
	<title>LessPane · Pick a time</title>
</svelte:head>

<SketchDefs />

<Journey stage={2} />

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
		<p class="why"><Icon name="info" size={16} /> Pick what suits you. We’ll confirm the exact time within that window.</p>
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
				<input {id} name={id} placeholder={label} defaultValue={values[id] ?? ''} aria-invalid={!!errors[id]} {...attrs} />
			</label>
			{#if errors[id]}<p class="error">{errors[id]}</p>{/if}
		</div>
	{/snippet}

	<section class="card who" aria-label="Where and who">
		<div class="stack">
			<p class="cue"><Icon name="pin" size={18} /><span class="label">Where and who</span></p>
			<ul class="whys">
				<li><Icon name="mail" size={15} /> Email, the only must: your copy of the request and a link to change it.</li>
				<li><Icon name="phone" size={15} /> Mobile, optional: we text to confirm the time. No marketing.</li>
				<li><Icon name="pin" size={15} /> Address, optional: helps us plan the visit. We can ask later.</li>
			</ul>
			{@render field('email', 'mail', 'Email', { type: 'email', autocomplete: 'email', required: true, onblur: checkEmail, oninput: () => (emailSuggestion = null) })}
			{#if emailSuggestion}
				<p class="suggest" role="status">
					Did you mean <button type="button" class="link" onclick={useSuggestion}>{emailSuggestion}</button>?
				</p>
			{/if}
			<div class="row">
				{@render field('name', 'user', 'Name (optional)', { type: 'text', autocomplete: 'name' })}
				{@render field('phone', 'phone', 'Mobile (optional)', { type: 'tel', autocomplete: 'tel' })}
			</div>
			<div class="row addr">
				{@render field('address', 'pin', 'Street address (optional)', { type: 'text', autocomplete: 'street-address' })}
				{@render field('zip', 'home', 'ZIP (optional)', { type: 'text', inputmode: 'numeric', autocomplete: 'postal-code', maxlength: 5, oninput: checkZip })}
			</div>
			{#if zipNote && !errors.zip}
				<p class="error" role="status">{zipNote} Questions? Email <a href="mailto:{business.contactEmail}">{business.contactEmail}</a>.</p>
			{/if}

			<button class="btn block send" type="submit" disabled={submitting} aria-label={`Request my visit, ${formatUsd(data.quote.total)}`}>
				{#if submitting}…{:else}<Icon name="check" /> Request my visit · {formatUsd(data.quote.total)}{/if}
			</button>
			<p class="fine muted">No payment now · we’ll confirm the time</p>
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

	.why {
		display: flex;
		align-items: flex-start;
		gap: 6px;
		margin: -4px 0 10px;
		font-size: 0.92rem;
		color: var(--ink-soft);
	}

	.whys {
		display: grid;
		gap: 2px;
		margin: -6px 0 4px;
		padding: 0;
		list-style: none;
		font-size: 0.88rem;
		color: var(--ink-soft);
	}

	.whys li {
		display: flex;
		align-items: center;
		gap: 6px;
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

	.suggest {
		margin: -6px 0 0;
		font-size: 0.95rem;
	}

	.suggest .link {
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		font-weight: 600;
		color: var(--brand);
		text-decoration: underline;
		cursor: pointer;
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
