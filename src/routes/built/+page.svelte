<script lang="ts">
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import { assistant, business } from '#lib/config.ts';

	// "How it's built": what LessPane does for a small business, and the engineering under it, for hiring
	// managers and would-be clients. Every claim here is checkable in the source (README, cloudbuild.yaml).
	const showcase = business.showcase;

	const flow: { icon: IconName; title: string; text: string }[] = [
		{ icon: 'home', title: 'The customer describes the house', text: 'Floors, sides and windows per side, by swipe, tap or keyboard. Or a ready-made package, or a chat.' },
		{ icon: 'sparkle', title: 'The price appears at once', text: 'The same pricing code runs in the browser for speed and again on the server, which never trusts a price sent to it.' },
		{ icon: 'calendar', title: 'They pick a day and a time', text: 'Only an email is required. The request is saved in Firestore with a private link to change or cancel it.' },
		{ icon: 'mail', title: 'The owner hears about it', text: 'An email alert and a tentative Google Calendar event. Confirming in the owner page makes the event solid.' }
	];

	const points: { icon: IconName; title: string; text: string }[] = [
		{
			icon: 'check',
			title: 'Prices are never taken from the browser',
			text: 'Every booking is priced again on the server from the house description, using the one pricing function and the business settings in one file.'
		},
		{
			icon: 'user',
			title: 'No accounts, and no secrets in the database',
			text: 'Each booking gets a link built from 24 random bytes. Only its SHA-256 hash is stored, so the database alone cannot open a booking. The page is sent with noindex and no-store.'
		},
		{
			icon: 'chat',
			title: 'An assistant that cannot make up a price',
			text: `The "Ask us" chat is Gemini on Vertex AI. It prices, checks ZIP codes and books only through tools that call the site's own code, confirms before booking, and has usage limits (${assistant.requestsPerMinute} requests a minute per visitor, ${assistant.dailyModelCalls} model calls a day per server).`
		},
		{
			icon: 'mail',
			title: 'Google Workspace without key files',
			text: 'Gmail sending and Calendar sync use keyless domain-wide delegation: the server signs short-lived tokens through Google’s IAM API, so no key file exists. The owner signs in with Google. A failed email or calendar call is logged and never loses a booking.'
		},
		{
			icon: 'up',
			title: 'Staging first, then a tagged release',
			text: 'Every push to main runs type checks and unit tests, builds a container and deploys staging (lesspane.net). Only a version tag deploys production. The server runs on Cloud Run under an account that can reach only its own data, model and secrets.'
		},
		{
			icon: 'hand',
			title: 'Tested the way people use it',
			text: 'Unit tests for pricing, validation and the assistant’s tools; a headless-browser test that swipes, taps and drags through every step and books; and a separate eval suite that checks the assistant’s answers against the real pricing code.'
		},
		{
			icon: 'send',
			title: 'Other people’s AI assistants can order too',
			text: 'An MCP server and an HTTP API let someone’s own assistant price and request a visit, through the same pricing and checks. The customer confirms each request from an email the agent never sees, and evals have a real model order as an agent would.'
		}
	];
</script>

<svelte:head>
	<title>How it's built · LessPane demo</title>
	<meta name="description" content="How LessPane works: instant quotes, booking without accounts, an AI assistant that prices through tested code, and a staging-first release pipeline on Google Cloud." />
</svelte:head>

<section class="intro">
	<p class="step">Demo · how it's built</p>
	<h1>A small business that books itself.</h1>
	<p>
		LessPane was built to a local window cleaner's spec, with AI coding agents, and is kept running as a working
		showcase. It takes a customer from “how much?” to a booked visit in about a minute, and hands the owner
		requests that are already priced and on the calendar.
	</p>
</section>

<section aria-labelledby="flow">
	<h2 id="flow" class="head"><Icon name="right" size={20} /> One booking, end to end</h2>
	<ol class="flow">
		{#each flow as f, i (f.title)}
			<li>
				<span class="num">{i + 1}</span>
				<span class="body"><strong><Icon name={f.icon} size={18} /> {f.title}</strong>{f.text}</span>
			</li>
		{/each}
	</ol>
	<p class="try">
		<a class="btn" href="/">Try the customer's side</a>
		<a class="btn ghost" href="/owner">See the owner's side</a>
	</p>
</section>

<section aria-labelledby="under">
	<h2 id="under" class="head"><Icon name="sparkle" size={20} /> Under the hood</h2>
	<div class="points">
		{#each points as p (p.title)}
			<article class="point">
				<h3><Icon name={p.icon} size={20} /> {p.title}</h3>
				<p>{p.text}</p>
			</article>
		{/each}
	</div>
</section>

<section aria-labelledby="stack" class="stack-list">
	<h2 id="stack" class="head"><Icon name="note" size={20} /> The stack</h2>
	<dl>
		<dt>App</dt><dd>SvelteKit 3, Svelte 5, TypeScript; hand-drawn SVG sketches, no UI library</dd>
		<dt>Data</dt><dd>Firestore, with rules that deny every direct client access</dd>
		<dt>AI</dt><dd>Gemini ({assistant.model}) on Vertex AI, with function calling</dd>
		<dt>Hosting</dt><dd>Cloud Run (scales to zero), Cloud Build, Artifact Registry, Secret Manager</dd>
		<dt>Google Workspace</dt><dd>Gmail API, Calendar API, Google sign-in for the owner</dd>
		<dt>Cost</dt><dd>At demo traffic it runs inside Google Cloud's free allowances; the domain is the real cost</dd>
	</dl>
</section>

<section aria-labelledby="more" class="more">
	<h2 id="more" class="head"><Icon name="window" size={20} /> See more</h2>
	<ul>
		<li><a href={showcase.sourceUrl}>The source on GitHub</a>: README, tests and pipeline</li>
		<li><a href={showcase.evalsUrl}>The assistant's evals</a>: how its answers are tested</li>
		<li><a href="/agents">Ordering by AI agent</a>: what an assistant needs to book a visit</li>
		<li><a href="/video">A 37-second video</a> for business owners, and <a href="/deck">the feature tour</a></li>
	</ul>
	<p class="by">
		Built by <a href={showcase.builtByUrl}>{showcase.builtBy}</a>. Want something like this for your business?
		<a href={showcase.practice.url}>{showcase.practice.name}</a>.
	</p>
</section>

<style>
	section + section {
		margin-top: 28px;
	}

	.intro h1 {
		margin: 0 0 6px;
		font-size: clamp(1.8rem, 7vw, 2.3rem);
		line-height: 1.05;
	}

	.intro p {
		margin: 0;
		color: var(--ink-soft);
	}

	.head {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 1.5rem;
		margin-bottom: 10px;
	}

	.head :global(svg) {
		color: var(--coral);
	}

	.flow {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 10px;
	}

	.flow li {
		display: grid;
		grid-template-columns: 34px 1fr;
		gap: 10px;
		align-items: start;
	}

	.num {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border: 2px solid var(--ink);
		border-radius: 50%;
		background: var(--highlight);
		font-family: var(--hand);
		font-size: 1.2rem;
	}

	.flow .body {
		display: grid;
		gap: 2px;
		font-size: 0.92rem;
		color: var(--ink-soft);
	}

	.flow strong,
	.point h3 {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--ink);
	}

	.flow strong {
		font-size: 1rem;
	}

	.flow strong :global(svg),
	.point h3 :global(svg) {
		flex: none;
		color: var(--brand);
	}

	.try {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin: 16px 0 0;
	}

	.try .btn {
		flex: 1 1 200px;
	}

	.points {
		display: grid;
		gap: 12px;
	}

	.point {
		padding: 14px 16px;
		border: 1.5px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--paper);
		box-shadow: var(--shadow);
	}

	.point h3 {
		margin: 0 0 4px;
		font-size: 1.3rem;
		line-height: 1.15;
	}

	.point p {
		margin: 0;
		font-size: 0.92rem;
		color: var(--ink-soft);
	}

	dl {
		display: grid;
		grid-template-columns: max-content 1fr;
		gap: 6px 14px;
		margin: 0;
		font-size: 0.92rem;
	}

	dt {
		font-weight: 650;
	}

	dd {
		margin: 0;
		color: var(--ink-soft);
	}

	.more ul {
		margin: 0;
		padding-left: 20px;
		display: grid;
		gap: 4px;
	}

	.by {
		margin: 16px 0 0;
		padding: 12px 14px;
		border: 1.5px dashed var(--line);
		border-radius: var(--sketchy);
	}

	@media (max-width: 420px) {
		dl {
			grid-template-columns: 1fr;
			gap: 0;
		}

		dd {
			margin-bottom: 8px;
		}
	}
</style>
