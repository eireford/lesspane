<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import FlipWindow from '$lib/components/FlipWindow.svelte';
	import SketchDefs from '$lib/components/SketchDefs.svelte';
	import HouseCard from '$lib/components/HouseCard.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import PeelPane from '$lib/components/PeelPane.svelte';
	import Squeegee from '$lib/components/Squeegee.svelte';
	import SwipeCard, { type SwipeDir } from '$lib/components/SwipeCard.svelte';
	import { pricing, type AddOnKey } from '$lib/config';
	import { houses } from '$lib/sketches';
	import { computeQuote, formatUsd } from '$lib/pricing';
	import { jobToSearchParams } from '$lib/validation';

	// Four things to play with. Each starts on a sensible choice, so there's a price before anyone
	// touches anything. Scheduling comes later, on /book.
	//   house card  → swipe for the house type (and stories)      starts: a two-story colonial
	//   squeegee    → pull for how many windows                     starts: 20
	//   flip window → outside only, or both sides                   starts: outside only
	//   stickers    → peel off the extra problems to fix            starts: none
	// Coming back from /book, the query string restores what was picked.

	/** A typical home; more than this and we size it up on site. */
	const MAX_WINDOWS = 40;

	const start = untrack(() => page.url.searchParams);
	const startWindows = Number(start.get('windows'));

	let pick = $state(Math.max(0, houses.findIndex((h) => h.id === start.get('house'))));
	let windows = $state(Number.isInteger(startWindows) && startWindows >= 1 && startWindows <= MAX_WINDOWS ? startWindows : 20);
	let inside = $state(start.get('service') === 'interior_exterior');
	let addons = $state<AddOnKey[]>(start.getAll('addons').filter((a): a is AddOnKey => a in pricing.addOns));
	let showLimits = $state(false);
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

	const bookHref = $derived(
		`/book?${jobToSearchParams({ stories: house.stories, windows, service, addons }, house.id)}`
	);
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
	<p class="cue" aria-hidden="true" style="color: var(--coral)"><Icon name="home" size={18} /><span class="gesture">⟷</span></p>
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
	<p class="cue" aria-hidden="true" style="color: var(--lake)"><Icon name="window" size={18} /><span class="gesture">⟶</span></p>
	<Squeegee bind:value={windows} max={MAX_WINDOWS} />
</section>

<!-- 3 + 4. Both sides? Flip the window. Extras? Peel the stickers. -->
<section class="play pair">
	<div aria-label="Inside too: flip the window">
		<p class="cue" aria-hidden="true" style="color: var(--berry)"><Icon name="hand" size={18} /><span class="gesture">↻</span></p>
		<FlipWindow bind:inside extra={insideCost} />
	</div>
	<div aria-label="Extra problems: peel off the stickers">
		<p class="cue" aria-hidden="true" style="color: var(--marigold)"><Icon name="sparkle" size={18} /><span class="gesture">⤴</span></p>
		<PeelPane bind:addons cost={addOnCost} />
	</div>
</section>

<!-- Next: pick a time and say where, on the booking page -->
<a class="btn block book-cta" href={bookHref} aria-label={`Book this, ${formatUsd(quote.total)}`}>
	<Icon name="calendar" /> {formatUsd(quote.total)} <Icon name="right" />
</a>

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
		background: rgb(255 255 255 / 0.96);
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
		/* Highlighter swipe under the price */
		padding: 0 4px;
		background: linear-gradient(transparent 55%, var(--highlight) 55%, var(--highlight) 92%, transparent 92%);
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

	.play + .play {
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

	.book-cta {
		margin-top: 30px;
		min-height: 60px;
		font-size: 1.5rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.gesture {
			animation: none;
		}
	}

</style>
