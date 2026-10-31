<script lang="ts">
	import { page } from '$app/state';
	import { untrack } from 'svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import Journey from '$lib/components/Journey.svelte';
	import LayoutSketch from '$lib/components/LayoutSketch.svelte';
	import SketchDefs from '$lib/components/SketchDefs.svelte';
	import SwipeCard, { type SwipeDir } from '$lib/components/SwipeCard.svelte';
	import { pricing, type AddOnKey, type Stories } from '$lib/config';
	import {
		BUCKETS,
		FLOOR_NAMES,
		MAX_SIDES,
		SIDE_CHOICES,
		SIDE_NAMES,
		defaultLayout,
		layoutToSearchParams,
		parseLayout,
		resize,
		totalWindows,
		type Layout,
		type Sides
	} from '$lib/layout';
	import { computeQuote, formatUsd } from '$lib/pricing';

	// The quote is a short process. Each step shows a sensible default: accept it with ✓, or change it by
	// swiping the card (or tapping ‹ ›). Steps: floors → sides to clean → windows on each floor of each
	// side (in buckets) → summary with optional extras → /book for the day, time and contact details.
	// Coming back from /book, the query string restores every choice.

	type Step =
		| { kind: 'floors' }
		| { kind: 'sides' }
		| { kind: 'windows'; side: number; floor: number }
		| { kind: 'summary' };

	const start = untrack(() => page.url.searchParams);
	const restored = parseLayout(start);

	let layout = $state<Layout>(restored ?? defaultLayout(2, 4));
	let inside = $state(start.get('service') === 'interior_exterior');
	let addons = $state<AddOnKey[]>(start.getAll('addons').filter((a): a is AddOnKey => a in pricing.addOns));
	let at = $state(0);
	let showLimits = $state(false);
	let card = $state<SwipeCard>();

	const steps = $derived<Step[]>([
		{ kind: 'floors' },
		{ kind: 'sides' },
		...Array.from({ length: layout.sides }, (_, side) =>
			Array.from({ length: layout.floors }, (_, floor) => ({ kind: 'windows' as const, side, floor }))
		).flat(),
		{ kind: 'summary' }
	]);
	// Restored from /book: go straight to the summary.
	if (restored) at = 2 + restored.sides * restored.floors;

	const step = $derived(steps[Math.min(at, steps.length - 1)]);
	const windows = $derived(totalWindows(layout));
	const service = $derived(inside ? 'interior_exterior' : 'exterior');
	const quoteFor = (o: { inside?: boolean; addons?: AddOnKey[] } = {}) =>
		computeQuote({
			windows: Math.max(1, windows),
			stories: layout.floors,
			service: (o.inside ?? inside) ? 'interior_exterior' : 'exterior',
			addons: o.addons ?? addons
		});
	const quote = $derived(quoteFor());

	// ---------- The option on the current step ----------

	/** How many options this step has, which one is chosen, and how to show it. */
	const options = $derived.by(() => {
		if (step.kind === 'floors')
			return { count: 3, index: layout.floors - 1, label: (i: number) => `${i + 1} floor${i ? 's' : ''}` };
		if (step.kind === 'sides')
			return { count: MAX_SIDES, index: layout.sides - 1, label: (i: number) => SIDE_CHOICES[(i + 1) as Sides] };
		if (step.kind === 'windows') {
			const s = step;
			return {
				count: BUCKETS.length,
				index: layout.windows[s.side][s.floor],
				label: (i: number) => (i ? `${BUCKETS[i].label} windows` : 'No windows')
			};
		}
		return { count: 0, index: 0, label: () => '' };
	});

	function choose(i: number) {
		i = Math.max(0, Math.min(options.count - 1, i));
		if (step.kind === 'floors') layout = resize(layout, (i + 1) as Stories, layout.sides);
		else if (step.kind === 'sides') layout = resize(layout, layout.floors, (i + 1) as Sides);
		else if (step.kind === 'windows') layout.windows[step.side][step.floor] = i;
	}

	/** Swipe left for the next option, right for the previous one. */
	function onSwipe(dir: SwipeDir) {
		choose(options.index + (dir === 'left' ? 1 : -1));
	}

	const title = $derived.by(() => {
		if (step.kind === 'floors') return 'How many floors?';
		if (step.kind === 'sides') return 'Which sides get cleaned?';
		if (step.kind === 'windows') return `${SIDE_NAMES[step.side]} · ${FLOOR_NAMES[step.floor]}`;
		return 'Your estimate';
	});
	const icon = $derived<IconName>(
		step.kind === 'floors' ? 'home' : step.kind === 'sides' ? 'back' : step.kind === 'windows' ? 'window' : 'sparkle'
	);

	/** One line under each step's title: why we're asking. */
	const why = $derived.by(() => {
		if (step.kind === 'floors') return 'Upper floors need ladders and take longer, so they cost a little more per window.';
		if (step.kind === 'sides') return 'We only price the walls you want cleaned. Skip any you don’t.';
		if (step.kind === 'windows')
			return 'Count the windows you can see on this floor. A rough range is fine; your technician confirms on arrival.';
		return 'This is your estimate. Nothing is booked yet, and there’s nothing to pay now.';
	});

	function next() {
		at = Math.min(at + 1, steps.length - 1);
	}

	function back() {
		at = Math.max(0, at - 1);
	}

	// ---------- Summary ----------

	const extras: { key: AddOnKey | 'inside'; icon: IconName; label: string }[] = [
		{ key: 'inside', icon: 'hand', label: 'Inside too' },
		{ key: 'screens', icon: 'mesh', label: 'Screens' },
		{ key: 'tracks', icon: 'track', label: 'Tracks' },
		{ key: 'hard_water', icon: 'drop', label: 'Hard water' }
	];
	const isOn = (key: AddOnKey | 'inside') => (key === 'inside' ? inside : addons.includes(key));
	function toggle(key: AddOnKey | 'inside') {
		if (key === 'inside') inside = !inside;
		else addons = addons.includes(key) ? addons.filter((a) => a !== key) : [...addons, key];
	}
	const extraCost = (key: AddOnKey | 'inside') =>
		key === 'inside'
			? quoteFor({ inside: true }).subtotal - quoteFor({ inside: false }).subtotal
			: windows * pricing.addOns[key].price;

	const bookHref = $derived.by(() => {
		const p = layoutToSearchParams(layout);
		p.set('service', service);
		for (const a of addons) p.append('addons', a);
		return `/book?${p}`;
	});
</script>

<svelte:head>
	<title>LessPane · Your window cleaning estimate</title>
</svelte:head>

<SketchDefs />

<!-- What this is and how it works, before anyone is asked anything -->
{#if at === 0}
	<section class="intro">
		<h1>Clean windows, priced in a minute.</h1>
		<p>
			Answer a few quick questions about your house and see your price right away. Then pick a time and we’ll text
			you to confirm. No account, no payment up front, no waiting for a callback.
		</p>
	</section>
{/if}
<Journey stage={step.kind === 'summary' ? 1 : 0} />

<!-- Live estimate, always in view -->
<div class="price-bar" aria-live="polite">
	<span class="label-stack">
		<small class="tag">Estimate</small>
		<span class="amount"><Icon name="sparkle" size={22} />{formatUsd(quote.total)}</span>
	</span>
	<span class="parts" aria-label={`${windows} windows`}><Icon name="window" size={16} />{windows}</span>
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
			<li>The floors, sides and window counts you picked. Each range is priced at its top end.</li>
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

<!-- Where you are in the process -->
<div class="progress" aria-label={`Step ${Math.min(at, steps.length - 1) + 1} of ${steps.length}`}>
	{#each steps as _, i}<i class:done={i < at} class:on={i === at}></i>{/each}
</div>

<section class="flow" aria-live="polite">
	<p class="cue"><Icon name={icon} size={20} /><span class="title">{title}</span></p>
	<p class="why"><Icon name="info" size={16} /> {why}</p>

	{#if step.kind !== 'summary'}
		{#key `${at}-${options.index}`}
			<SwipeCard bind:this={card} dirs={['left', 'right']} onswipe={onSwipe} label={`${title}: ${options.label(options.index)}. Swipe to change.`}>
				{#snippet children(lean: number)}
					<div class="sketch-card">
						<LayoutSketch
							{layout}
							mode={step.kind === 'windows' ? 'wall' : step.kind === 'sides' ? 'sides' : 'floors'}
							side={step.kind === 'windows' ? step.side : 0}
							floor={step.kind === 'windows' ? step.floor : 0}
						/>
						<span class="peek left" style="opacity: {Math.max(0, lean) * 0.9}">{options.index > 0 ? options.label(options.index - 1) : ''}</span>
						<span class="peek right" style="opacity: {Math.max(0, -lean) * 0.9}"
							>{options.index < options.count - 1 ? options.label(options.index + 1) : ''}</span
						>
					</div>
				{/snippet}
			</SwipeCard>
		{/key}

		<!-- The choice: the default is already picked; change it left or right -->
		<div class="chooser">
			<button type="button" class="nudge" aria-label="Fewer" disabled={options.index === 0} onclick={() => choose(options.index - 1)}>
				<Icon name="left" size={26} />
			</button>
			<div class="value">
				<strong>{options.label(options.index)}</strong>
				<span class="dots" aria-hidden="true">{#each Array(options.count) as _, i}<i class:on={i === options.index}></i>{/each}</span>
			</div>
			<button type="button" class="nudge" aria-label="More" disabled={options.index === options.count - 1} onclick={() => choose(options.index + 1)}>
				<Icon name="right" size={26} />
			</button>
		</div>

		<div class="actions-row">
			<button type="button" class="round" aria-label="Previous step" disabled={at === 0} onclick={back}><Icon name="undo" /></button>
			<button type="button" class="btn ok" onclick={next}><Icon name="check" /> Looks right</button>
		</div>
		{#if step.kind === 'windows'}
			<button type="button" class="skip" onclick={() => (at = steps.length - 1)}>Use suggested counts for the rest →</button>
		{/if}
	{:else}
		<!-- Summary: what the steps built, the extras, and on to booking -->
		<div class="summary card">
			<div class="mini"><LayoutSketch {layout} mode="floors" /></div>
			<ul class="lines">
				<li>
					<span>{layout.floors} floor{layout.floors > 1 ? 's' : ''} · {SIDE_CHOICES[layout.sides].toLowerCase()}</span>
					<button type="button" class="edit" onclick={() => (at = 0)}>change</button>
				</li>
				{#each layout.windows as sideBuckets, s}
					<li>
						<span>{SIDE_NAMES[s]}: {sideBuckets.map((b) => BUCKETS[b].label).join(' / ')}</span>
						<button type="button" class="edit" onclick={() => (at = 2 + s * layout.floors)}>change</button>
					</li>
				{/each}
				<li class="total">
					<span><Icon name="window" size={16} /> about {windows} windows</span><span>{formatUsd(quote.lines[0].amount)}</span>
				</li>
			</ul>
		</div>

		<p class="cue extras-cue"><Icon name="sparkle" size={18} /><span class="title small">Anything extra?</span><span class="hint">tap to add</span></p>
		<div class="extras">
			{#each extras as x (x.key)}
				<button type="button" class="extra" class:on={isOn(x.key)} aria-pressed={isOn(x.key)} onclick={() => toggle(x.key)}>
					<Icon name={x.icon} size={26} />
					<span class="name">{x.label}</span>
					<small>+{formatUsd(extraCost(x.key))}</small>
				</button>
			{/each}
		</div>

		<a class="btn block book-cta" href={bookHref} aria-label={`Book a time, ${formatUsd(quote.total)}`}>
			<Icon name="calendar" /> Book a time · {formatUsd(quote.total)} <Icon name="right" />
		</a>
		<button type="button" class="skip" onclick={back}>← Back to the last step</button>
	{/if}
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
		margin-bottom: 12px;
		padding: 8px 8px 8px 16px;
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		background: rgb(255 255 255 / 0.96);
		box-shadow: var(--shadow);
	}

	.label-stack {
		display: grid;
		line-height: 1;
	}

	.tag {
		font-family: var(--hand);
		font-size: 0.95rem;
		color: var(--ink-soft);
	}

	.amount {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 0 4px;
		font-family: var(--hand);
		font-size: 2rem;
		color: var(--brand);
		background: linear-gradient(transparent 55%, var(--highlight) 55%, var(--highlight) 92%, transparent 92%);
	}

	.parts {
		display: inline-flex;
		align-items: center;
		gap: 3px;
		margin-right: auto;
		align-self: flex-end;
		padding-bottom: 6px;
		color: var(--ink-soft);
		font-weight: 650;
	}

	.info {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border: 1.5px solid var(--line);
		border-radius: 50%;
		background: var(--paper);
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

	/* ---------- Intro and journey ---------- */

	.intro h1 {
		margin: 0 0 6px;
		font-size: clamp(1.9rem, 8vw, 2.5rem);
		line-height: 1.05;
	}

	.intro p {
		margin: 0 0 14px;
		color: var(--ink-soft);
	}

	.why {
		display: flex;
		align-items: flex-start;
		gap: 6px;
		margin: -4px 0 12px;
		font-size: 0.92rem;
		color: var(--ink-soft);
	}

	.why :global(svg) {
		margin-top: 3px;
	}

	/* ---------- Progress ---------- */

	.progress {
		display: flex;
		gap: 4px;
		margin: 0 0 16px;
	}

	.progress i {
		flex: 1;
		height: 6px;
		border-radius: 3px;
		background: var(--line);
	}

	.progress i.done {
		background: var(--brand);
	}

	.progress i.on {
		background: var(--marigold);
	}

	/* ---------- Step ---------- */

	.cue {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 10px;
		color: var(--lake);
	}

	.title {
		font-family: var(--hand);
		font-size: 1.6rem;
		line-height: 1.1;
		color: var(--ink);
	}

	.title.small {
		font-size: 1.3rem;
	}

	.hint {
		margin-left: auto;
		font-family: var(--hand);
		color: var(--ink-soft);
	}

	.sketch-card {
		position: relative;
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		overflow: hidden;
		background: var(--paper);
		box-shadow: var(--shadow);
	}

	.peek {
		position: absolute;
		top: 12px;
		padding: 2px 10px;
		border: 1.5px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--highlight);
		font-family: var(--hand);
		font-size: 1.1rem;
		pointer-events: none;
	}

	.peek:empty {
		display: none;
	}

	.peek.left {
		left: 12px;
	}

	.peek.right {
		right: 12px;
	}

	.chooser {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 10px;
		margin-top: 14px;
	}

	.nudge,
	.round {
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--paper);
		color: var(--ink);
		cursor: pointer;
	}

	.nudge:disabled,
	.round:disabled {
		color: var(--line);
		border-color: var(--line);
		cursor: default;
	}

	.value {
		display: grid;
		justify-items: center;
		gap: 6px;
		text-align: center;
	}

	.value strong {
		font-family: var(--hand);
		font-size: 1.8rem;
		font-weight: 400;
		line-height: 1;
		padding: 0 6px;
		background: linear-gradient(transparent 55%, var(--highlight) 55%, var(--highlight) 92%, transparent 92%);
	}

	.dots {
		display: flex;
		gap: 5px;
	}

	.dots i {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--line);
	}

	.dots i.on {
		background: var(--lake);
	}

	.actions-row {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 10px;
		margin-top: 18px;
	}

	.ok {
		min-height: 56px;
		font-size: 1.4rem;
	}

	.skip {
		display: block;
		margin: 12px auto 0;
		border: 0;
		background: none;
		font-family: var(--hand);
		font-size: 1.05rem;
		color: var(--ink-soft);
		text-decoration: underline;
		cursor: pointer;
	}

	/* ---------- Summary ---------- */

	.summary {
		display: grid;
		gap: 10px;
	}

	.mini {
		width: 100%;
		max-width: 220px;
		margin: 0 auto;
	}

	.summary .lines li {
		align-items: center;
		font-family: var(--hand);
		font-size: 1.1rem;
	}

	.summary .lines .total {
		font-size: 1.25rem;
		border-bottom: 0;
	}

	.edit {
		border: 0;
		background: none;
		font-family: var(--hand);
		font-size: 1rem;
		color: var(--lake);
		text-decoration: underline;
		cursor: pointer;
	}

	.extras-cue {
		margin-top: 22px;
		color: var(--marigold);
	}

	.extras {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 8px;
	}

	.extra {
		display: grid;
		justify-items: center;
		gap: 2px;
		padding: 10px 2px 8px;
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--paper);
		color: var(--ink);
		cursor: pointer;
	}

	.extra .name {
		font-family: var(--hand);
		font-size: 1rem;
		line-height: 1.1;
	}

	.extra small {
		font-family: var(--hand);
		color: var(--bark);
	}

	.extra.on {
		background: var(--brand-soft);
		border-color: var(--brand);
		color: var(--brand);
	}

	.book-cta {
		margin-top: 22px;
		min-height: 60px;
		font-size: 1.5rem;
	}
</style>
