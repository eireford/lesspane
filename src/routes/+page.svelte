<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import FlipWindow from '$lib/components/FlipWindow.svelte';
	import SketchDefs from '$lib/components/SketchDefs.svelte';
	import HouseCard from '$lib/components/HouseCard.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import PeelPane from '$lib/components/PeelPane.svelte';
	import Squeegee from '$lib/components/Squeegee.svelte';
	import SunDial from '$lib/components/SunDial.svelte';
	import SwipeCard, { type SwipeDir } from '$lib/components/SwipeCard.svelte';
	import { pricing, type AddOnKey, type TimeWindow } from '$lib/config';
	import { houses } from '$lib/sketches';
	import { computeQuote, formatUsd } from '$lib/pricing';
	import { addDaysIso } from '$lib/validation';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// One page, five things to play with. Each starts on a sensible choice, so there's a price
	// before anyone touches anything:
	//   house card  → swipe for the house type (and stories)      starts: a two-story house
	//   squeegee    → pull for how many windows                     starts: 20
	//   flip window → outside only, or both sides                   starts: outside only
	//   stickers    → peel off the extra problems to fix            starts: none
	//   sun dial    → day strip + drag the sun for morning/after    starts: a few days out, morning

	/** A typical home; more than this and we size it up on site. */
	const MAX_WINDOWS = 40;

	/** A few days out, skipping Sunday. */
	function firstGoodDay(min: string) {
		let d = addDaysIso(min, 2);
		if (new Date(`${d}T12:00:00`).getDay() === 0) d = addDaysIso(d, 1);
		return d;
	}

	let pick = $state(0);
	let windows = $state(20);
	let inside = $state(false);
	let addons = $state<AddOnKey[]>([]);
	// Only the starting day comes from the server; after that it's the visitor's pick.
	let date = $state(firstGoodDay(untrack(() => data.dateRange.min)));
	let time = $state<TimeWindow>('morning');
	let showLimits = $state(false);
	let submitting = $state(false);
	let card = $state<SwipeCard>();

	const house = $derived(houses[pick]);
	const service = $derived(inside ? 'interior_exterior' : 'exterior');
	const quoteFor = (o: { inside?: boolean; addons?: AddOnKey[] } = {}) =>
		computeQuote({
			windows,
			stories: house.stories,
			service: (o.inside ?? inside) ? 'interior_exterior' : 'exterior',
			addons: o.addons ?? addons
		});
	const quote = $derived(quoteFor());
	const insideCost = $derived(`+${formatUsd(quoteFor({ inside: true }).subtotal - quoteFor({ inside: false }).subtotal)}`);
	const addOnCost = (key: AddOnKey) =>
		`+${formatUsd(windows * pricing.addOns[key].price)}`;
	const addOnIcons: Record<AddOnKey, IconName> = { screens: 'mesh', tracks: 'track', hard_water: 'drop' };

	function onHouseSwipe(dir: SwipeDir) {
		pick = (pick + (dir === 'left' ? 1 : -1) + houses.length) % houses.length;
	}

	const errors = $derived((form?.errors ?? {}) as Record<string, string>);
	const values = $derived((form?.values ?? {}) as Partial<Record<string, string>>);
</script>

<svelte:head>
	<title>LessPane · Play with it, see the price</title>
</svelte:head>

<SketchDefs />

<!-- Live price, always in view -->
<div class="price-bar" aria-live="polite">
	<span class="amount"><Icon name="sparkle" size={22} />{formatUsd(quote.total)}</span>
	<span class="parts" aria-hidden="true">
		<Icon name="window" size={16} />{windows}
		{#if inside}<Icon name="hand" size={16} />{/if}
		{#each addons as a (a)}<Icon name={addOnIcons[a]} size={16} />{/each}
	</span>
	<button type="button" class="info" aria-expanded={showLimits} aria-label="What this estimate covers" onclick={() => (showLimits = !showLimits)}>
		<Icon name="info" size={20} />
	</button>
</div>
{#if showLimits}
	<!-- Placeholder terms: review before the pilot. -->
	<div class="limits card">
		<p>
			An instant estimate. Your technician walks the job with you on arrival and gives a formal estimate before any
			work starts. It holds as long as the home matches what you set here:
		</p>
		<ul>
			<li>The number of windows and the house type you picked.</li>
			<li>Standard-size residential windows, reachable by ladder up to three stories.</li>
			<li>Not included: skylights, storm windows, sunrooms, inside glass more than 10 feet up.</li>
			<li>Paint, sticker or construction residue is quoted separately.</li>
			<li>Hard-water removal covers normal spotting; etched glass needs restoration pricing.</li>
			<li>Screen cleaning doesn't include repairs or replacements.</li>
		</ul>
		<p>If anything differs, you'll see the new price before we start, and you can say no.</p>
		{#if quote.minimumApplied}<p>The {formatUsd(pricing.minimum)} minimum visit applies.</p>{/if}
	</div>
{/if}

<!-- 1. House: swipe the card -->
<section class="play" aria-label="Your kind of house: swipe to change">
	<p class="cue" aria-hidden="true"><Icon name="home" size={18} /><span class="gesture">⟷</span></p>
	<div class="house-stack">
		{#key pick}
			<SwipeCard bind:this={card} dirs={['left', 'right']} onswipe={onHouseSwipe} label={`${house.name}. Swipe for another house.`}>
				{#snippet children(lean: number)}
					<HouseCard {house} clean={windows} {inside} {addons} {lean} />
				{/snippet}
			</SwipeCard>
		{/key}
	</div>
	<div class="dots" aria-hidden="true">
		<button type="button" class="arrow" tabindex="-1" onclick={() => card?.fling('right')}><Icon name="left" size={18} /></button>
		{#each houses as h, i (h.id)}<i class:on={i === pick}></i>{/each}
		<button type="button" class="arrow" tabindex="-1" onclick={() => card?.fling('left')}><Icon name="right" size={18} /></button>
	</div>
</section>

<!-- 2. How many windows: pull the squeegee -->
<section class="play" aria-label="How many windows: pull the squeegee">
	<p class="cue" aria-hidden="true"><Icon name="window" size={18} /><span class="gesture">⟶</span></p>
	<Squeegee bind:value={windows} max={MAX_WINDOWS} />
</section>

<!-- 3 + 4. Both sides? Flip the window. Extras? Peel the stickers. -->
<section class="play pair">
	<div aria-label="Inside too: flip the window">
		<p class="cue" aria-hidden="true"><Icon name="hand" size={18} /><span class="gesture">↻</span></p>
		<FlipWindow bind:inside extra={insideCost} />
	</div>
	<div aria-label="Extra problems: peel off the stickers">
		<p class="cue" aria-hidden="true"><Icon name="sparkle" size={18} /><span class="gesture">⤴</span></p>
		<PeelPane bind:addons cost={addOnCost} />
	</div>
</section>

<!-- 5. When: pick a day, drag the sun -->
<section class="play" aria-label="When: pick a day and drag the sun">
	<p class="cue" aria-hidden="true"><Icon name="calendar" size={18} /><span class="gesture">☀</span></p>
	<SunDial min={data.dateRange.min} max={data.dateRange.max} bind:date bind:time />
	{#if errors.preferredDate}<p class="error">{errors.preferredDate}</p>{/if}
</section>

<!-- Who and where, then send -->
<section class="card book" aria-label="Where and who">
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

		<!-- What the controls above chose. The server re-validates and re-prices it. -->
		<input type="hidden" name="stories" value={house.stories} />
		<input type="hidden" name="windows" value={windows} />
		<input type="hidden" name="service" value={service} />
		{#each addons as addon}<input type="hidden" name="addons" value={addon} />{/each}
		<input type="hidden" name="preferredDate" value={date} />
		<input type="hidden" name="preferredWindow" value={time} />
		<input type="hidden" name="notes" value={`House picked: ${house.name}`} />

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

		<div class="row addr">
			{@render field('address', 'pin', 'Street address', { type: 'text', autocomplete: 'street-address', required: true })}
			{@render field('zip', 'home', 'ZIP', { type: 'text', inputmode: 'numeric', autocomplete: 'postal-code', maxlength: 5, required: true })}
		</div>
		{@render field('name', 'user', 'Name', { type: 'text', autocomplete: 'name', required: true })}
		<div class="row">
			{@render field('phone', 'phone', 'Mobile', { type: 'tel', autocomplete: 'tel', required: true })}
			{@render field('email', 'mail', 'Email', { type: 'email', autocomplete: 'email', required: true })}
		</div>

		<button class="btn block send" type="submit" disabled={submitting} aria-label={`Request my visit, ${formatUsd(quote.total)}`}>
			{#if submitting}…{:else}<Icon name="check" /> {formatUsd(quote.total)}{/if}
		</button>
		<p class="fine muted">No payment now · we text to confirm</p>
	</form>
</section>

<style>
	/* ---------- Price bar ---------- */

	.price-bar {
		position: sticky;
		top: 68px;
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 14px;
		padding: 8px 8px 8px 16px;
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		background: rgb(251 250 247 / 0.95);
		backdrop-filter: blur(6px);
		box-shadow: var(--shadow);
	}

	.amount {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--hand);
		font-size: 2rem;
		font-weight: 400;
		letter-spacing: -0.02em;
		color: var(--brand);
	}

	.parts {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		margin-right: auto;
		color: var(--ink-soft);
		font-weight: 650;
	}

	.info {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border: 0;
		border-radius: 50%;
		background: var(--sky);
		color: var(--ink-soft);
		cursor: pointer;
	}

	.limits {
		margin-bottom: 14px;
		font-size: 0.9rem;
		color: var(--ink-soft);
	}

	.limits ul {
		padding-left: 1.1rem;
		margin: 6px 0;
	}

	/* ---------- Play areas ---------- */

	.play + .play,
	.play + .book {
		margin-top: 26px;
	}

	.cue {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0 0 8px;
		color: var(--brand);
	}

	.gesture {
		font-size: 1.1rem;
		color: var(--ink-soft);
		animation: cue 1.8s ease-in-out infinite;
	}

	@keyframes cue {
		50% {
			transform: translateX(4px);
			opacity: 0.6;
		}
	}

	.house-stack {
		position: relative;
	}

	.dots {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
		margin-top: 8px;
	}

	.dots i {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--line);
	}

	.dots i.on {
		width: 18px;
		border-radius: 3px;
		background: var(--brand);
	}

	.arrow {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--ink-soft);
		cursor: pointer;
	}

	.pair {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px;
		align-items: start;
	}

	/* ---------- Booking ---------- */

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
		font-size: 1.2rem;
	}

	.fine {
		margin: 0;
		font-size: 0.85rem;
		text-align: center;
	}

	@media (prefers-reduced-motion: reduce) {
		.gesture {
			animation: none;
		}
	}

	@media (max-width: 420px) {
		.row,
		.row.addr {
			grid-template-columns: 1fr;
		}
	}
</style>
