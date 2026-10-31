<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import Journey from '$lib/components/Journey.svelte';
	import LayoutSketch from '$lib/components/LayoutSketch.svelte';
	import SketchDefs from '$lib/components/SketchDefs.svelte';
	import { PACKAGES, layoutToSearchParams, totalWindows } from '$lib/layout';
	import { computeQuote, formatUsd } from '$lib/pricing';

	// Landing page: say what LessPane is and how it works, then offer two ways in. Pick a ready-made package
	// (straight to the estimate summary on /quote, where extras and changes are one tap away), or answer the
	// quick questions on /quote for a closer price.
	const packages = PACKAGES.map((p) => {
		const windows = totalWindows(p.layout);
		const href = `/quote?${new URLSearchParams([...layoutToSearchParams(p.layout), ['service', 'exterior']])}`;
		const price = computeQuote({ windows, stories: p.layout.floors, service: 'exterior', addons: [] }).total;
		return { ...p, windows, href, price };
	});
</script>

<svelte:head>
	<title>LessPane · Window cleaning, priced in a minute</title>
</svelte:head>

<SketchDefs />

<section class="intro">
	<h1>Clean windows, priced in a minute.</h1>
	<p>
		See your price right away, pick a time, and we’ll text you to confirm. No account, no payment up front, no
		waiting for a callback.
	</p>
</section>

<Journey stage={0} />

<section aria-labelledby="packages">
	<h2 id="packages" class="choose"><Icon name="home" size={20} /> Pick the house closest to yours</h2>
	<p class="why">Each package covers the outside of every window on all four sides. You can add extras or adjust it next.</p>
	<div class="packages">
		{#each packages as p (p.id)}
			<a class="package" href={p.href} data-package={p.id} aria-label={`${p.name}: ${p.blurb}, about ${p.windows} windows, ${formatUsd(p.price)}`}>
				<span class="sketch"><LayoutSketch layout={p.layout} mode="floors" /></span>
				<span class="body">
					<strong class="name">{p.name}</strong>
					<span class="blurb">{p.blurb} · about {p.windows} windows</span>
				</span>
				<span class="price">{formatUsd(p.price)} <Icon name="right" size={18} /></span>
			</a>
		{/each}
	</div>
</section>

<p class="or" aria-hidden="true"><span>or</span></p>

<a class="questions" href="/quote">
	<span class="q-icon"><Icon name="window" size={30} /></span>
	<span class="body">
		<strong class="name">Answer a few quick questions</strong>
		<span class="blurb">Floors, sides and roughly how many windows. About a minute, for a closer price.</span>
	</span>
	<Icon name="right" size={22} />
</a>

<style>
	.intro h1 {
		margin: 0 0 6px;
		font-size: clamp(1.9rem, 8vw, 2.5rem);
		line-height: 1.05;
	}

	.intro p {
		margin: 0 0 14px;
		color: var(--ink-soft);
	}

	.choose {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 6px 0 4px;
		font-size: 1.5rem;
	}

	.choose :global(svg) {
		color: var(--coral);
	}

	.why {
		margin: 0 0 12px;
		font-size: 0.92rem;
		color: var(--ink-soft);
	}

	.packages {
		display: grid;
		gap: 12px;
	}

	.package,
	.questions {
		display: grid;
		align-items: center;
		gap: 12px;
		padding: 10px 14px 10px 10px;
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--paper);
		color: var(--ink);
		text-decoration: none;
		box-shadow: var(--shadow);
		transition: transform 0.1s ease;
	}

	.package {
		grid-template-columns: 110px 1fr auto;
	}

	.package:hover,
	.questions:hover {
		transform: translateY(-2px);
	}

	.package:focus-visible,
	.questions:focus-visible {
		outline: 3px solid var(--accent);
		outline-offset: 3px;
	}

	.sketch {
		display: block;
		border: 1.5px solid var(--ink);
		border-radius: var(--sketchy);
		overflow: hidden;
	}

	.body {
		display: grid;
		gap: 2px;
	}

	.name {
		font-family: var(--hand);
		font-size: 1.35rem;
		font-weight: 400;
		line-height: 1.05;
	}

	.blurb {
		font-size: 0.88rem;
		color: var(--ink-soft);
		line-height: 1.3;
	}

	.price {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		padding: 0 4px;
		font-family: var(--hand);
		font-size: 1.6rem;
		color: var(--brand);
		background: linear-gradient(transparent 55%, var(--highlight) 55%, var(--highlight) 92%, transparent 92%);
		white-space: nowrap;
	}

	.or {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 18px 0;
		font-family: var(--hand);
		font-size: 1.2rem;
		color: var(--ink-soft);
	}

	.or::before,
	.or::after {
		content: '';
		flex: 1;
		border-top: 1.5px dashed var(--line);
	}

	.questions {
		grid-template-columns: auto 1fr auto;
		padding: 14px;
		background: var(--brand-soft);
		border-color: var(--brand);
	}

	.q-icon {
		display: grid;
		place-items: center;
		width: 54px;
		height: 54px;
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--paper);
		color: var(--lake);
	}

	@media (max-width: 400px) {
		.package {
			grid-template-columns: 84px 1fr;
		}

		.price {
			grid-column: 2;
			justify-self: start;
		}
	}
</style>
