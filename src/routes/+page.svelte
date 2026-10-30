<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import HouseScene from '$lib/components/HouseScene.svelte';
	import { pricing, timeWindowLabels, type AddOnKey, type Stories, type TimeWindow } from '$lib/config';
	import { housePhotos } from '$lib/photos';
	import { computeQuote, formatUsd } from '$lib/pricing';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	/** Back-and-side tiles the scene will draw; bigger homes add a note and get sized up on site. */
	const MAX_EXTRA = 40;

	let stories = $state<Stories>(2);
	let extra = $state(6);
	let dirt = $state<number[]>(Array(housePhotos[2].windows.length + 6).fill(1));
	let inside = $state(false);
	let addons = $state<AddOnKey[]>([]);
	let booking = $state(false);
	let submitting = $state(false);
	let bookingEl = $state<HTMLElement>();

	const wiped = $derived(dirt.filter((d) => d === 0).length);
	const service = $derived(inside ? 'interior_exterior' : 'exterior');
	const quoteFor = (o: { inside?: boolean; addons?: AddOnKey[] } = {}) =>
		computeQuote({
			windows: wiped,
			stories,
			service: (o.inside ?? inside) ? 'interior_exterior' : 'exterior',
			addons: o.addons ?? addons
		});
	const quote = $derived(wiped > 0 ? quoteFor() : null);

	/** What switching one problem on adds to the bill right now, before rounding. */
	const deltaInside = $derived(quoteFor({ inside: true }).subtotal - quoteFor({ inside: false }).subtotal);
	const deltaAddOn = (key: AddOnKey) =>
		quoteFor({ addons: [...new Set([...addons, key])] }).subtotal -
		quoteFor({ addons: addons.filter((a) => a !== key) }).subtotal;

	const problems: { key: AddOnKey; title: string; how: string }[] = [
		{ key: 'screens', title: 'Dusty screens', how: 'Screens off, washed, dried, back on.' },
		{ key: 'tracks', title: 'Gunk in the tracks and sills', how: 'Vacuumed, scrubbed and wiped.' },
		{ key: 'hard_water', title: 'Hard-water spots', how: 'Mineral spotting lifted from the glass.' }
	];

	function setStories(s: Stories) {
		stories = s;
		// A new photo has different windows; start it grimy.
		dirt = Array(housePhotos[s].windows.length + extra).fill(1);
	}

	function setExtra(n: number) {
		extra = Math.min(MAX_EXTRA, Math.max(0, n));
		const total = housePhotos[stories].windows.length + extra;
		dirt = total > dirt.length ? [...dirt, ...Array(total - dirt.length).fill(1)] : dirt.slice(0, total);
	}

	function toggleAddOn(key: AddOnKey) {
		addons = addons.includes(key) ? addons.filter((a) => a !== key) : [...addons, key];
	}

	async function startBooking() {
		booking = true;
		await tick();
		bookingEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	const errors = $derived((form?.errors ?? {}) as Record<string, string>);
	const values = $derived((form?.values ?? {}) as Partial<Record<string, string>>);
	const windowEntries = Object.entries(timeWindowLabels) as [TimeWindow, string][];

	$effect(() => {
		// A failed submit re-renders the page; keep the booking form open so errors show.
		if (form) booking = true;
	});
</script>

<svelte:head>
	<title>LessPane · Wipe away the windows you don't want to clean</title>
</svelte:head>

<section class="intro">
	<h1>Wipe away the windows you don't want to clean.</h1>
	<p class="muted">Pick the house most like yours, then rub or tap each grimy window you'd rather not clean yourself. The price updates as you go.</p>
</section>

<section class="stage stack">
	<div class="controls">
		<fieldset>
			<legend>Stories</legend>
			<div class="seg">
				{#each [1, 2, 3] as s}
					<button
						type="button"
						class:on={stories === s}
						aria-pressed={stories === s}
						onclick={() => setStories(s as Stories)}>{s}{s === 3 ? '+' : ''}</button
					>
				{/each}
			</div>
		</fieldset>
		<fieldset>
			<legend>More windows around back</legend>
			<div class="stepper">
				<button type="button" aria-label="Fewer back and side windows" onclick={() => setExtra(extra - 1)}
					>−</button
				>
				<output aria-live="polite">{extra}</output>
				<button type="button" aria-label="More back and side windows" onclick={() => setExtra(extra + 1)}
					>+</button
				>
			</div>
		</fieldset>
	</div>

	<HouseScene {stories} bind:dirt {inside} {addons} />

	<div class="scene-actions">
		<button type="button" class="btn ghost" onclick={() => (dirt = dirt.map(() => 0))}>Wipe them all</button>
		<button type="button" class="btn ghost" onclick={() => (dirt = dirt.map(() => 1))} disabled={wiped === 0}
			>Start over</button
		>
	</div>
	<p class="muted small">{dirt.length} windows in all · {wiped} for us</p>
	{#if extra === MAX_EXTRA}
		<p class="muted small">Even more? Wipe them all and mention it in your notes; we'll size it up on site.</p>
	{/if}
</section>

<section class="stack">
	<h2>Anything else bugging you?</h2>
	<button type="button" class="problem" class:on={inside} aria-pressed={inside} onclick={() => (inside = !inside)}>
		<span class="tick" aria-hidden="true">{inside ? '✓' : ''}</span>
		<span class="what">
			<strong>Smudges on the inside</strong>
			<span class="muted">We clean both sides of every window you wiped.</span>
		</span>
		<span class="cost">{wiped ? `+${formatUsd(deltaInside)}` : ''}</span>
	</button>
	{#each problems as p (p.key)}
		{@const on = addons.includes(p.key)}
		<button type="button" class="problem" class:on aria-pressed={on} onclick={() => toggleAddOn(p.key)}>
			<span class="tick" aria-hidden="true">{on ? '✓' : ''}</span>
			<span class="what">
				<strong>{p.title}</strong>
				<span class="muted">{p.how}</span>
			</span>
			<span class="cost">
				{wiped ? `+${formatUsd(deltaAddOn(p.key))}` : `${formatUsd(pricing.addOns[p.key].price)}/window`}
			</span>
		</button>
	{/each}
</section>

<section class="result card stack" aria-live="polite">
	{#if quote}
		<p class="eyebrow">Your problem goes away for</p>
		<p class="price">{formatUsd(quote.total)}</p>
		<ul class="lines">
			{#each quote.lines as line}
				<li><span>{line.label}</span><span>{formatUsd(line.amount)}</span></li>
			{/each}
		</ul>
		{#if quote.minimumApplied}
			<p class="muted small-left">Our {formatUsd(pricing.minimum)} minimum visit applies.</p>
		{/if}
		<details class="limits">
			<summary>Instant estimate · what it covers</summary>
			<!-- Placeholder terms: review before the pilot. -->
			<p>
				Your technician walks the job with you on arrival and gives a formal estimate before any work starts.
				This price holds as long as the home matches what you showed us here:
			</p>
			<ul>
				<li>The number of windows and stories you set.</li>
				<li>Standard-size residential windows, reachable by ladder up to three stories.</li>
				<li>Not included: skylights, storm windows, sunrooms, and inside glass more than 10 feet up.</li>
				<li>Paint, sticker or construction residue is quoted separately.</li>
				<li>Hard-water removal covers normal mineral spotting; etched glass needs restoration pricing.</li>
				<li>Screen cleaning doesn't include repairs or replacements.</li>
			</ul>
			<p>If anything differs, you'll see the new price before we start, and you can say no.</p>
		</details>
		{#if !booking}
			<button type="button" class="btn block" onclick={startBooking}>Make it go away</button>
		{/if}
	{:else}
		<p class="eyebrow">Your price</p>
		<p class="empty">Wipe a window to see it.</p>
	{/if}
</section>

{#if booking && quote}
	<section class="card stack" bind:this={bookingEl} id="book">
		<h2>Where and when?</h2>
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

			<!-- What the house scene built. The server re-validates and re-prices it. -->
			<input type="hidden" name="stories" value={stories} />
			<input type="hidden" name="windows" value={wiped} />
			<input type="hidden" name="service" value={service} />
			{#each addons as addon}
				<input type="hidden" name="addons" value={addon} />
			{/each}

			<div class="honeypot" aria-hidden="true">
				<label for="company">Company</label>
				<input id="company" name="company" type="text" tabindex="-1" autocomplete="off" />
			</div>

			<div class="row">
				<div class="wide">
					<label for="address">Street address</label>
					<input
						id="address"
						name="address"
						type="text"
						autocomplete="street-address"
						required
						value={values.address ?? ''}
						aria-invalid={!!errors.address}
					/>
					{#if errors.address}<p class="error">{errors.address}</p>{/if}
				</div>
				<div>
					<label for="zip">ZIP</label>
					<input
						id="zip"
						name="zip"
						type="text"
						inputmode="numeric"
						autocomplete="postal-code"
						maxlength="5"
						required
						value={values.zip ?? ''}
						aria-invalid={!!errors.zip}
					/>
					{#if errors.zip}<p class="error">{errors.zip}</p>{/if}
				</div>
			</div>

			<div class="row">
				<div>
					<label for="preferredDate">Preferred day</label>
					<input
						id="preferredDate"
						name="preferredDate"
						type="date"
						min={data.dateRange.min}
						max={data.dateRange.max}
						required
						value={values.preferredDate ?? ''}
						aria-invalid={!!errors.preferredDate}
					/>
					{#if errors.preferredDate}<p class="error">{errors.preferredDate}</p>{/if}
				</div>
				<fieldset>
					<legend>Time of day</legend>
					<div class="choices">
						{#each windowEntries as [value, label]}
							<label class="choice">
								<input
									type="radio"
									name="preferredWindow"
									{value}
									checked={(values.preferredWindow || 'morning') === value}
								/>
								<span>{label.split(' ')[0]}</span>
							</label>
						{/each}
					</div>
					{#if errors.preferredWindow}<p class="error">{errors.preferredWindow}</p>{/if}
				</fieldset>
			</div>

			<div>
				<label for="name">Name</label>
				<input
					id="name"
					name="name"
					type="text"
					autocomplete="name"
					required
					value={values.name ?? ''}
					aria-invalid={!!errors.name}
				/>
				{#if errors.name}<p class="error">{errors.name}</p>{/if}
			</div>

			<div class="row">
				<div>
					<label for="phone">Mobile phone</label>
					<input
						id="phone"
						name="phone"
						type="tel"
						autocomplete="tel"
						required
						value={values.phone ?? ''}
						aria-invalid={!!errors.phone}
					/>
					{#if errors.phone}<p class="error">{errors.phone}</p>{/if}
				</div>
				<div>
					<label for="email">Email</label>
					<input
						id="email"
						name="email"
						type="email"
						autocomplete="email"
						required
						value={values.email ?? ''}
						aria-invalid={!!errors.email}
					/>
					{#if errors.email}<p class="error">{errors.email}</p>{/if}
				</div>
			</div>

			<div>
				<label for="notes">Notes <span class="hint">(optional: gate code, pets, parking)</span></label>
				<textarea id="notes" name="notes" maxlength="500" value={values.notes ?? ''}></textarea>
				{#if errors.notes}<p class="error">{errors.notes}</p>{/if}
			</div>

			<button class="btn block" type="submit" disabled={submitting}>
				{submitting ? 'Sending…' : `Request my visit · ${formatUsd(quote.total)}`}
			</button>
			<p class="muted small">No payment now. We'll text you to confirm the exact time.</p>
		</form>
	</section>
{/if}

{#if quote && !booking}
	<div class="dock">
		<span><span class="muted">Gone for</span> <strong>{formatUsd(quote.total)}</strong></span>
		<button type="button" class="btn" onclick={startBooking}>Book it</button>
	</div>
{/if}

<style>
	.intro h1 {
		font-size: clamp(1.7rem, 7vw, 2.3rem);
	}

	.intro {
		margin-bottom: 16px;
	}

	section + section {
		margin-top: 24px;
	}

	h2 {
		font-size: 1.25rem;
	}

	.controls {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		flex-wrap: wrap;
	}

	legend {
		font-size: 0.9rem;
		color: var(--ink-soft);
	}

	.seg,
	.stepper {
		display: inline-flex;
		border: 1.5px solid var(--line);
		border-radius: 999px;
		background: var(--paper);
		overflow: hidden;
	}

	.seg button,
	.stepper button {
		min-width: 48px;
		min-height: 44px;
		border: 0;
		background: transparent;
		font: inherit;
		font-weight: 650;
		color: var(--ink);
		cursor: pointer;
	}

	.seg button.on {
		background: var(--brand);
		color: var(--brand-ink);
	}

	.stepper button {
		font-size: 1.3rem;
		color: var(--brand);
	}

	.stepper output {
		display: grid;
		place-items: center;
		min-width: 40px;
		font-weight: 700;
	}

	.scene-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
	}

	.scene-actions .btn {
		min-height: 44px;
	}

	.problem {
		display: grid;
		grid-template-columns: 28px 1fr auto;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 14px;
		text-align: left;
		font: inherit;
		color: inherit;
		background: var(--paper);
		border: 1.5px solid var(--line);
		border-radius: 12px;
		cursor: pointer;
	}

	.problem + .problem {
		margin-top: 10px;
	}

	.problem.on {
		border-color: var(--brand);
		background: var(--brand-soft);
	}

	.problem:focus-visible {
		outline: 3px solid color-mix(in srgb, var(--brand) 35%, transparent);
		outline-offset: 2px;
	}

	.tick {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1.5px solid var(--line);
		color: var(--brand-ink);
		font-weight: 800;
	}

	.problem.on .tick {
		background: var(--brand);
		border-color: var(--brand);
	}

	.what {
		display: grid;
		gap: 2px;
	}

	.what .muted {
		font-size: 0.9rem;
	}

	.cost {
		font-weight: 650;
		color: var(--bark);
		white-space: nowrap;
	}

	.result .eyebrow {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 650;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--brand);
	}

	.result .price {
		margin: 4px 0 0;
		color: var(--brand);
	}

	.empty {
		margin: 4px 0 0;
		font-size: 1.3rem;
		color: var(--ink-soft);
	}

	.limits {
		font-size: 0.92rem;
		color: var(--ink-soft);
		background: var(--sky);
		border-radius: 10px;
		padding: 10px 14px;
	}

	.limits summary {
		font-weight: 650;
		color: var(--ink);
		cursor: pointer;
	}

	.limits ul {
		padding-left: 1.1rem;
		margin: 6px 0;
	}

	.small {
		font-size: 0.9rem;
		text-align: center;
	}

	.small-left {
		font-size: 0.9rem;
		margin: 0;
	}

	.row {
		align-items: start;
	}

	.row .wide {
		grid-column: auto;
	}

	.row:has(.wide) {
		grid-template-columns: 2fr 1fr;
	}

	.dock {
		position: sticky;
		bottom: calc(12px + env(safe-area-inset-bottom));
		margin-top: 20px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 10px 10px 10px 18px;
		background: var(--paper);
		border: 1.5px solid var(--brand);
		border-radius: 999px;
		box-shadow: var(--shadow);
		font-size: 1.1rem;
	}

	.dock .btn {
		min-height: 44px;
	}

	@media (max-width: 420px) {
		.row,
		.row:has(.wide) {
			grid-template-columns: 1fr;
		}
	}
</style>
