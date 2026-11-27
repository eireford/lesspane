<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import Journey from '#lib/components/Journey.svelte';
	import LayoutSketch from '#lib/components/LayoutSketch.svelte';
	import SketchDefs from '#lib/components/SketchDefs.svelte';
	import { openChat } from '#lib/components/ChatPanel.svelte';
	import { PACKAGES, layoutToSearchParams, totalWindows } from '#lib/layout.ts';
	import { computeQuote, formatUsd } from '#lib/pricing.ts';
	import { visibleTestimonials } from '#lib/config.ts';
	import { jsonLd, structuredData } from '#lib/agent-guide.ts';
	import { page } from '$app/state';

	// Landing page: say what LessPane is and how it works, then offer two ways in. Pick a ready-made package
	// (straight to the estimate summary on /quote, where extras and changes are one tap away), or answer the
	// quick questions on /quote for a closer price.
	const packages = PACKAGES.map((p) => {
		const windows = totalWindows(p.layout);
		const href = `/quote?${new URLSearchParams([...layoutToSearchParams(p.layout), ['service', 'exterior']])}`;
		const price = computeQuote({ windows, stories: p.layout.floors, service: 'exterior', addons: [] }).total;
		return { ...p, windows, href, price };
	});

	// Sample testimonials only appear in the demo; real ones (sample: false) always do.
	const quotes = visibleTestimonials();
	const hasSamples = quotes.some((t) => t.sample);
</script>

<svelte:head>
	<title>LessPane · Window cleaning, priced in a minute</title>
	<!-- What the business is, for search engines and AI agents (schema.org). -->
	{@html jsonLd(structuredData(page.url.origin))}
</svelte:head>

<SketchDefs />

<section class="intro">
	<h1>Clean windows, priced in a minute.</h1>
	<p>
		See your price right away, pick a time, and we’ll confirm it with you. No account, no payment up front, no
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

<button type="button" class="questions chat" onclick={() => openChat()}>
	<span class="q-icon"><Icon name="chat" size={28} /></span>
	<span class="body">
		<strong class="name">Ask us anything</strong>
		<span class="blurb">Chat about prices, what's included, or book a time in a few messages.</span>
	</span>
	<Icon name="right" size={22} />
</button>

<!-- People can have their own AI assistant do it, through LessPane's MCP server and API (/agents). Every claim
	here matches the agent tools in src/lib/server/agent-api.ts and the safeguards on /agents/demo. -->
<section class="your-ai" aria-labelledby="your-ai">
	<h2 id="your-ai" class="choose"><Icon name="sparkle" size={20} /> Or have your own AI assistant do it</h2>
	<p class="why">
		Use Claude, ChatGPT, Gemini, Copilot or Le Chat? Add LessPane to it once, then just ask. It works with us
		directly:
	</p>
	<ul class="can">
		<li><Icon name="sparkle" size={18} /><span><strong>Gets your estimate</strong> from our own prices, never a guess, and checks that we come to your ZIP code.</span></li>
		<li><Icon name="calendar" size={18} /><span><strong>Arranges the visit:</strong> a day and morning or afternoon, and later a reschedule or a cancellation if you need one.</span></li>
		<li><Icon name="mail" size={18} /><span><strong>Leaves you in charge:</strong> nothing is booked until you confirm by email, and we confirm the time with you.</span></li>
	</ul>
	<p class="try">“Get me a price for the outside windows of my two-story house in 21601, and book next Tuesday morning.”</p>
	<a class="questions agent" href="/agents/demo#connect">
		<span class="q-icon"><Icon name="chat" size={28} /></span>
		<span class="body">
			<strong class="name">Connect your AI assistant</strong>
			<span class="blurb">A one-time step for each assistant, and a live demo of one booking a cleaning.</span>
		</span>
		<Icon name="right" size={22} />
	</a>
</section>

{#if quotes.length}
	<section class="said" aria-labelledby="said">
		<h2 id="said" class="choose"><Icon name="heart" size={20} /> What customers say</h2>
		{#if hasSamples}
			<p class="why">Sample testimonials written for this demo, not real reviews.</p>
		{/if}
		<div class="quotes">
			{#each quotes as t (t.quote)}
				<figure class="quote" data-sample={t.sample || undefined}>
					<blockquote>“{t.quote}”</blockquote>
					<figcaption>
						{#if t.sample}<span class="sample">Sample</span>{/if}
						{t.who}
					</figcaption>
				</figure>
			{/each}
		</div>
	</section>
{/if}

<style>
	.said {
		margin-top: 28px;
	}

	.quotes {
		display: grid;
		gap: 12px;
	}

	.quote {
		margin: 0;
		padding: 14px 16px;
		border: 1.5px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--paper);
		box-shadow: var(--shadow);
	}

	.quote blockquote {
		margin: 0 0 8px;
		font-family: var(--hand);
		font-size: 1.2rem;
		line-height: 1.3;
	}

	.quote figcaption {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.88rem;
		color: var(--ink-soft);
	}

	.sample {
		padding: 1px 8px;
		border: 1.5px dashed var(--accent);
		border-radius: var(--sketchy);
		color: var(--accent);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

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

	.questions.chat {
		width: 100%;
		margin-top: 12px;
		background: var(--glass);
		border-color: var(--lake);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.your-ai {
		margin-top: 28px;
	}

	.can {
		display: grid;
		gap: 8px;
		margin: 0 0 12px;
		padding: 0;
		list-style: none;
	}

	.can li {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 8px;
		align-items: start;
		line-height: 1.4;
	}

	.can li :global(svg) {
		margin-top: 2px;
		color: var(--lake);
	}

	.try {
		margin: 0 0 14px;
		padding: 10px 14px;
		border-left: 3px solid var(--coral);
		font-family: var(--hand);
		font-size: 1.15rem;
		line-height: 1.3;
	}

	.questions.agent {
		background: var(--glass);
		border-color: var(--lake);
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
