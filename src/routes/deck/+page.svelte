<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { onMount } from 'svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import Journey from '$lib/components/Journey.svelte';
	import LayoutSketch from '$lib/components/LayoutSketch.svelte';
	import SketchDefs from '$lib/components/SketchDefs.svelte';
	import { pricing } from '$lib/config';
	import { PACKAGES, defaultLayout, totalWindows } from '$lib/layout';
	import { computeQuote, formatUsd } from '$lib/pricing';

	// The feature tour: one slide at a time. Swipe, tap ‹ ›, use the arrow keys, or tap a dot.
	const packages = PACKAGES.map((p) => {
		const windows = totalWindows(p.layout);
		return { ...p, windows, price: computeQuote({ windows, stories: p.layout.floors, service: 'exterior', addons: [] }).total };
	});
	const house = defaultLayout(2, 4);

	const extras: { icon: IconName; label: string; price: string }[] = [
		{ icon: 'hand', label: 'Inside too', price: `+${Math.round((pricing.serviceFactor.interior_exterior - 1) * 100)}%` },
		...(
			[
				['mesh', 'screens'],
				['track', 'tracks'],
				['drop', 'hard_water']
			] as const
		).map(([icon, key]) => ({ icon, label: pricing.addOns[key].label, price: `+$${pricing.addOns[key].price}/window` }))
	];

	const TOTAL = 9;
	// The slide number lives in the hash (/deck#4), so a link can open on any slide.
	let at = $state(0);
	const go = (i: number) => {
		at = Math.max(0, Math.min(TOTAL - 1, i));
		replaceState(`#${at + 1}`, {});
	};
	onMount(() => {
		const n = Number(location.hash.slice(1));
		if (Number.isInteger(n) && n >= 1) at = Math.min(TOTAL, n) - 1;
	});

	function onkey(e: KeyboardEvent) {
		if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') go(at + 1);
		else if (e.key === 'ArrowLeft' || e.key === 'PageUp') go(at - 1);
		else if (e.key === 'Home') go(0);
		else if (e.key === 'End') go(TOTAL - 1);
		else return;
		e.preventDefault();
	}

	let startX: number | null = null;
	const down = (e: PointerEvent) => (startX = e.clientX);
	function up(e: PointerEvent) {
		if (startX === null) return;
		const dx = e.clientX - startX;
		startX = null;
		if (Math.abs(dx) > 50) go(at + (dx < 0 ? 1 : -1));
	}
</script>

<svelte:head>
	<title>LessPane · Feature tour</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<svelte:window onkeydown={onkey} />

<SketchDefs />

<section class="deck" aria-roledescription="slideshow" aria-label="LessPane features" onpointerdown={down} onpointerup={up}>
	<p class="count" aria-live="polite">{at + 1} / {TOTAL}</p>

	{#if at === 0}
		<article class="slide title" aria-label="Slide 1: LessPane">
			<img src="/icon.svg" alt="" width="96" height="96" />
			<h1>LessPane</h1>
			<p class="lede">Clean windows, priced in a minute.</p>
			<p>Window cleaning for Maryland’s Eastern Shore. Customers see a price, pick a time and book in one sitting.</p>
			<p class="hint"><Icon name="swipe" size={18} /> swipe, tap ›, or use the arrow keys</p>
		</article>
	{:else if at === 1}
		<article class="slide" aria-label="Slide 2: How it works">
			<h2><Icon name="sparkle" /> How it works</h2>
			<Journey stage={1} />
			<ul class="points">
				<li><Icon name="check" size={18} /> No account and no payment up front</li>
				<li><Icon name="check" size={18} /> No waiting for a callback: the price shows straight away</li>
				<li><Icon name="check" size={18} /> Every step says why we ask</li>
			</ul>
		</article>
	{:else if at === 2}
		<article class="slide" aria-label="Slide 3: Ready-made packages">
			<h2><Icon name="home" /> Start from a package</h2>
			<p>The landing page offers three typical houses. One tap opens the estimate, ready to adjust.</p>
			<div class="trio">
				{#each packages as p (p.id)}
					<figure>
						<span class="frame"><LayoutSketch layout={p.layout} mode="floors" /></span>
						<figcaption><strong>{p.name}</strong><span>{p.windows} windows</span><span class="price">{formatUsd(p.price)}</span></figcaption>
					</figure>
				{/each}
			</div>
		</article>
	{:else if at === 3}
		<article class="slide" aria-label="Slide 4: The quick questions">
			<h2><Icon name="window" /> Or answer three quick questions</h2>
			<div class="trio">
				<figure>
					<span class="frame"><LayoutSketch layout={house} mode="floors" /></span>
					<figcaption><strong>1 · Floors</strong><span>1 to 3</span></figcaption>
				</figure>
				<figure>
					<span class="frame"><LayoutSketch layout={house} mode="sides" /></span>
					<figcaption><strong>2 · Sides</strong><span>up to 8</span></figcaption>
				</figure>
				<figure>
					<span class="frame"><LayoutSketch layout={house} mode="wall" side={0} floor={1} /></span>
					<figcaption><strong>3 · Windows</strong><span>per side and floor</span></figcaption>
				</figure>
			</div>
			<p>Windows come in easy buckets (none, 1–2, 3–4, 5–6, 7–9, 10+), so nobody has to count panes.</p>
		</article>
	{:else if at === 4}
		<article class="slide" aria-label="Slide 5: Defaults and gestures">
			<h2><Icon name="swipe" /> Accept the default, or nudge it</h2>
			<div class="pair">
				<div class="tile"><Icon name="heart" size={34} /><strong>Keep</strong><span>Each step starts on a sensible guess</span></div>
				<div class="tile"><span class="arrows"><Icon name="left" size={34} /><Icon name="right" size={34} /></span><strong>Change</strong><span>Swipe, tap ‹ ›, or use the arrow keys</span></div>
				<div class="tile"><Icon name="up" size={34} /><strong>Skip ahead</strong><span>Use suggested counts for the rest</span></div>
			</div>
			<p>Pencil sketches redraw as you go, so the house on screen always matches the answers.</p>
		</article>
	{:else if at === 5}
		<article class="slide" aria-label="Slide 6: Estimate and extras">
			<h2><Icon name="sparkle" /> A price, with extras one tap away</h2>
			<ul class="extras">
				{#each extras as x}
					<li><Icon name={x.icon} size={22} /><span>{x.label}</span><span class="price small">{x.price}</span></li>
				{/each}
			</ul>
			<p>From ${pricing.perWindow} a window outside, more for upper floors, minimum {formatUsd(pricing.minimum)}. Prices are worked out on the server, never trusted from the browser.</p>
		</article>
	{:else if at === 6}
		<article class="slide" aria-label="Slide 7: Booking">
			<h2><Icon name="calendar" /> Pick a day, drag the sun</h2>
			<div class="pair">
				<div class="tile"><Icon name="sun" size={34} /><strong>Morning</strong><span>8am to 12pm</span></div>
				<div class="tile"><Icon name="sunset" size={34} /><strong>Afternoon</strong><span>12pm to 5pm</span></div>
				<div class="tile"><Icon name="pin" size={34} /><strong>Where and who</strong><span>Address, mobile, email</span></div>
			</div>
			<p>Bookings outside the Eastern Shore’s ZIP codes are caught before they’re sent. We text to confirm the exact time.</p>
		</article>
	{:else if at === 7}
		<article class="slide" aria-label="Slide 8: Managing a booking">
			<h2><Icon name="mail" /> Change or cancel from the email</h2>
			<ul class="points">
				<li><Icon name="mail" size={18} /> The customer’s email has a private link, no login needed</li>
				<li><Icon name="calendar" size={18} /> Move to another day, or cancel with a confirm step</li>
				<li><Icon name="check" size={18} /> Only a fingerprint of the link is stored, so a leaked database can’t open bookings</li>
			</ul>
		</article>
	{:else if at === 8}
		<article class="slide" aria-label="Slide 9: For the business">
			<h2><Icon name="user" /> Behind the scenes</h2>
			<div class="pair">
				<div class="tile"><Icon name="mail" size={34} /><strong>Gmail</strong><span>Emails from hello@lesspane.com, alerts to the owner</span></div>
				<div class="tile"><Icon name="calendar" size={34} /><strong>Calendar</strong><span>Each booking appears, tentative until confirmed</span></div>
				<div class="tile"><Icon name="note" size={34} /><strong>Admin</strong><span>One list of requests to confirm, finish or cancel</span></div>
			</div>
			<p>Runs on Google Cloud Run. Pushes go to staging at lesspane.net; tagged releases go live at lesspane.com.</p>
			<a class="try" href="/" data-sveltekit-reload>Try it <Icon name="right" size={20} /></a>
		</article>
	{/if}

	<nav class="controls" aria-label="Slides">
		<button type="button" onclick={() => go(at - 1)} disabled={at === 0} aria-label="Previous slide"><Icon name="left" /></button>
		<span class="dots">
			{#each { length: TOTAL } as _, i}
				<button type="button" class="dot" class:on={i === at} onclick={() => go(i)} aria-label={`Slide ${i + 1}`} aria-current={i === at ? 'step' : undefined}></button>
			{/each}
		</span>
		<button type="button" onclick={() => go(at + 1)} disabled={at === TOTAL - 1} aria-label="Next slide"><Icon name="right" /></button>
	</nav>
</section>

<style>
	.deck {
		position: relative;
		display: grid;
		grid-template-rows: auto 1fr auto;
		min-height: min(78vh, 720px);
		touch-action: pan-y;
		user-select: none;
	}

	.count {
		margin: 0;
		justify-self: end;
		font-family: var(--hand);
		color: var(--ink-soft);
	}

	.slide {
		display: grid;
		align-content: center;
		gap: 12px;
		animation: in 0.25s ease;
	}

	@keyframes in {
		from {
			opacity: 0;
			transform: translateX(16px);
		}
	}

	.title {
		justify-items: center;
		text-align: center;
	}

	.title img {
		border-radius: 18px;
	}

	h1 {
		margin: 0;
		font-family: var(--hand);
		font-weight: 400;
		font-size: clamp(2.6rem, 12vw, 3.6rem);
		line-height: 1;
	}

	h2 {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		font-family: var(--hand);
		font-weight: 400;
		font-size: clamp(1.6rem, 7vw, 2.1rem);
		line-height: 1.1;
	}

	h2 :global(svg) {
		flex: none;
		color: var(--coral);
	}

	p {
		margin: 0;
		color: var(--ink-soft);
	}

	.lede {
		font-family: var(--hand);
		font-size: 1.5rem;
		color: var(--brand);
	}

	.hint {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: 12px;
		font-size: 0.9rem;
	}

	.points,
	.extras {
		display: grid;
		gap: 10px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.points li,
	.extras li {
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}

	.points :global(svg) {
		flex: none;
		margin-top: 3px;
		color: var(--brand);
	}

	.extras li {
		align-items: center;
		padding: 10px 12px;
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		box-shadow: var(--shadow);
	}

	.extras li span:first-of-type {
		flex: 1;
	}

	.extras :global(svg) {
		color: var(--lake);
	}

	.trio {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}

	figure {
		display: grid;
		gap: 6px;
		margin: 0;
	}

	.frame {
		display: block;
		border: 1.5px solid var(--ink);
		border-radius: var(--sketchy);
		overflow: hidden;
	}

	figcaption {
		display: grid;
		justify-items: center;
		text-align: center;
		font-size: 0.85rem;
		color: var(--ink-soft);
	}

	figcaption strong {
		font-family: var(--hand);
		font-size: 1.15rem;
		font-weight: 400;
		color: var(--ink);
	}

	.price {
		font-family: var(--hand);
		font-size: 1.3rem;
		color: var(--brand);
		background: linear-gradient(transparent 55%, var(--highlight) 55%, var(--highlight) 92%, transparent 92%);
	}

	.price.small {
		font-size: 1.1rem;
		white-space: nowrap;
	}

	.pair {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 10px;
	}

	.tile {
		display: grid;
		justify-items: center;
		align-content: start;
		gap: 4px;
		padding: 14px 8px;
		text-align: center;
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--brand-soft);
		box-shadow: var(--shadow);
	}

	.tile :global(svg) {
		color: var(--teal);
	}

	.tile strong {
		font-family: var(--hand);
		font-size: 1.25rem;
		font-weight: 400;
	}

	.tile span {
		font-size: 0.82rem;
		color: var(--ink-soft);
		line-height: 1.3;
	}

	.arrows {
		display: flex;
	}

	.try {
		justify-self: start;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 10px 18px;
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--brand);
		color: var(--brand-ink);
		font-family: var(--hand);
		font-size: 1.3rem;
		text-decoration: none;
		box-shadow: var(--shadow);
	}

	.controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding-top: 16px;
	}

	.controls > button {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border: 2px solid var(--ink);
		border-radius: 50%;
		background: var(--paper);
		color: var(--ink);
		cursor: pointer;
	}

	.controls > button:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.dots {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 4px;
	}

	.dot {
		width: 24px;
		height: 24px;
		padding: 0;
		border: none;
		background: none;
		cursor: pointer;
	}

	.dot::before {
		content: '';
		display: block;
		width: 10px;
		height: 10px;
		margin: auto;
		border: 1.5px solid var(--ink);
		border-radius: 50%;
	}

	.dot.on::before {
		background: var(--coral);
	}

	@media (max-width: 420px) {
		.pair {
			grid-template-columns: 1fr;
		}

		.tile {
			grid-template-columns: auto 1fr;
			justify-items: start;
			text-align: left;
			column-gap: 10px;
		}

		.tile :global(svg) {
			grid-row: span 2;
		}
	}
</style>
