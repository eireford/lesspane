<script lang="ts">
	import { agents } from '#lib/config.ts';
	import { makers as makersFor } from '#lib/agent-demo.ts';
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import Discovery from '#lib/components/agents/Discovery.svelte';
	import Makers from '#lib/components/agents/Makers.svelte';
	import Replay from '#lib/components/agents/Replay.svelte';
	import ToolConsole from '#lib/components/agents/ToolConsole.svelte';
	import type { PageData } from './$types';

	// How AI agents find and use LessPane, shown live against this site: for people curious about agents, for
	// developers wiring one up, and for anyone judging the work. The guide written for agents is /agents.
	let { data }: { data: PageData } = $props();
	const makers = $derived(makersFor(data.origin));
	// Picking an assistant in "Connect" also picks it in the conversation, and the other way round.
	let maker = $state('anthropic');

	const journey: { icon: IconName; title: string; text: string; href: string }[] = [
		{ icon: 'pin', title: 'Find', text: 'Search, a link, llms.txt, or a connector someone added.', href: '#find' },
		{ icon: 'chat', title: 'Connect', text: 'The person adds LessPane to their assistant once.', href: '#connect' },
		{ icon: 'sparkle', title: 'Price', text: 'The assistant asks LessPane, never guesses.', href: '#watch' },
		{ icon: 'hand', title: 'Ask', text: 'It shows the price and day, and waits for a yes.', href: '#watch' },
		{ icon: 'mail', title: 'Confirm', text: 'The customer confirms by email. Only then is it booked.', href: '#watch' }
	];

	const safety: { title: string; text: string }[] = [
		{ title: 'Prices only from LessPane', text: 'Every price comes from the site\'s own pricing code. A booking must carry a quote id that LessPane signed, so an agent can\'t change the price or make one up.' },
		{ title: 'Nothing booked behind your back', text: `An agent's request waits until the customer taps Confirm in an email the agent never sees. Unconfirmed requests lapse after ${agents.confirmHours} hours.` },
		{ title: 'A person checks, at first', text: 'The owner sees which requests came from an agent, and phones the customer about each one until agents have earned trust.' },
		{ title: 'No double bookings', text: 'A retry with the same request id and quote id returns the same booking, so a dropped connection can\'t book twice.' },
		{ title: 'Limits', text: `${agents.requestsPerMinute} requests a minute from one address, and ${agents.openRequestsPerEmail} open requests per customer email.` },
		{ title: 'No payment through agents', text: 'Customers pay after the job, as they would anyway. Agent payments are a later phase in the plan.' }
	];
</script>

<svelte:head>
	<title>AI agents, live · LessPane</title>
	<meta name="description" content="Watch an AI assistant find LessPane and order a window cleaning, live: discovery, MCP and HTTP, Claude, ChatGPT, Gemini, Copilot and Le Chat." />
</svelte:head>

<div class="wide">
<section class="intro">
	<p class="step">AI agents · live demo</p>
	<h1>Your AI assistant can order this.</h1>
	<p>
		People are starting to ask their AI assistants to handle errands. LessPane is built so an assistant can find it,
		price a job and ask for a visit on its own, while the customer stays in charge. This page shows every part of
		that, live: the calls below go to this site as you watch.
	</p>
	{#if data.demo}
		<p class="demo" role="note"><Icon name="info" size={18} /> LessPane is a demo: bookings are not real, and nobody will come to clean.</p>
	{/if}
	<ol class="journey">
		{#each journey as j, i (j.title)}
			<li>
				<a href={j.href}>
					<span class="num">{i + 1}</span>
					<strong><Icon name={j.icon} size={18} /> {j.title}</strong>
					<span>{j.text}</span>
				</a>
			</li>
		{/each}
	</ol>
</section>

<section id="find" aria-labelledby="find-h">
	<h2 id="find-h"><span class="n">1</span> How an agent finds LessPane</h2>
	<p class="lead">
		There is no single front door for AI agents yet, so LessPane has several. Pick one to see who uses it and what it
		holds, fetched live from this site.
	</p>
	<Discovery />
</section>

<section id="connect" aria-labelledby="connect-h">
	<h2 id="connect-h"><span class="n">2</span> Connect your assistant</h2>
	<p class="lead">
		Most assistants take an MCP connector: you paste one address, <code>{data.origin}/mcp</code>, and the assistant can
		use LessPane's tools from then on. How that looks for each AI maker, as of November 2026:
	</p>
	<Makers {makers} bind:selected={maker} />
</section>

<section id="watch" aria-labelledby="watch-h">
	<h2 id="watch-h"><span class="n">3</span> Watch a conversation</h2>
	<p class="lead">
		A person, their assistant and LessPane. The words are scripted, but the price checks and quotes are real calls to
		this site, made as you step through, and the replies use what came back. Switch to the HTTP API to see the same
		order without MCP.
	</p>
	<Replay origin={data.origin} tools={data.tools} {makers} bind:maker />
</section>

<section id="try" aria-labelledby="try-h">
	<h2 id="try-h"><span class="n">4</span> Try the tools yourself</h2>
	<p class="lead">The read-only tools, exactly as an agent calls them. Change the arguments and send.</p>
	<ToolConsole origin={data.origin} tools={data.tools} />
</section>

<section id="safe" aria-labelledby="safe-h">
	<h2 id="safe-h"><span class="n">5</span> What keeps it safe</h2>
	<div class="safety">
		{#each safety as s (s.title)}
			<article class="point">
				<h3><Icon name="check" size={18} /> {s.title}</h3>
				<p>{s.text}</p>
			</article>
		{/each}
	</div>
	<p class="muted">
		The reasoning, the phases and what's next (MCP directories, signed agent identities, payment) are in
		<a href={data.links.plan}>the agent ordering plan</a>.
	</p>
</section>

<section id="more" aria-labelledby="more-h" class="more">
	<h2 id="more-h"><span class="n">6</span> Learn more</h2>
	<div class="columns">
		<div>
			<h3>For agents and developers</h3>
			<ul>
				<li><a href="/agents">The guide for AI agents</a>, also as <a href="/llms.txt">llms.txt</a></li>
				<li><a href="/openapi.json">The OpenAPI description</a> of <code>/api/v1</code></li>
				<li>The MCP server: <code>{data.origin}/mcp</code></li>
				<li><a href={data.links.agentSuite}>The eval that orders with Gemini</a>, and <a href={data.links.evals}>all the evals</a></li>
				<li><a href={data.links.source}>The source on GitHub</a></li>
			</ul>
		</div>
		<div>
			<h3>For people</h3>
			<ul>
				<li><a href="/">Get a quote yourself</a>, the way a person does</li>
				<li><a href="/owner">The owner's side</a>, where agent requests land</li>
				<li><a href="/built">How LessPane is built</a></li>
				<li><a href="/video">A 37-second video</a></li>
			</ul>
		</div>
	</div>
	<p class="by">
		Built by {data.links.builtBy}, AI, data and identity engineer: <a href={data.links.builtByUrl}>the résumé</a>,
		with its own AI assistant. Want something like this for your business?
		<a href={data.links.practice.url}>{data.links.practice.name}</a>.
	</p>
</section>
</div>

<style>
	section + section {
		margin-top: 34px;
	}

	.intro h1 {
		margin: 0 0 8px;
		font-size: clamp(1.9rem, 7vw, 2.5rem);
		line-height: 1.05;
	}

	.intro > p {
		margin: 0 0 10px;
		max-width: 68ch;
	}

	.demo {
		display: flex;
		gap: 8px;
		padding: 8px 12px;
		border: 1.5px dashed var(--accent);
		border-radius: var(--sketchy);
		font-weight: 600;
	}

	.journey {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 8px;
		margin: 16px 0 0;
		padding: 0;
		list-style: none;
	}

	.journey a {
		display: grid;
		gap: 2px;
		height: 100%;
		padding: 10px 12px;
		border: 1.5px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--paper);
		box-shadow: var(--shadow);
		color: var(--ink);
		text-decoration: none;
	}

	.journey strong {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--hand);
		font-size: 1.25rem;
		font-weight: 400;
	}

	.journey span:last-child {
		font-size: 0.85rem;
		color: var(--ink-soft);
	}

	.num,
	.n {
		display: inline-grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border: 2px solid var(--ink);
		border-radius: 50%;
		background: var(--highlight);
		font-family: var(--hand);
		font-size: 1.05rem;
		line-height: 1;
	}

	h2 {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 1.55rem;
		margin: 0 0 6px;
	}

	.lead {
		margin: 0 0 12px;
		color: var(--ink-soft);
		max-width: 70ch;
	}

	code {
		font-size: 0.88em;
		overflow-wrap: anywhere;
	}

	.safety {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 10px;
		margin-bottom: 10px;
	}

	.point {
		padding: 12px 14px;
		border: 1.5px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--paper);
	}

	.point h3 {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0 0 4px;
		font-size: 1.1rem;
	}

	.point h3 :global(svg) {
		color: var(--brand);
		flex: none;
	}

	.point p {
		margin: 0;
		font-size: 0.9rem;
		color: var(--ink-soft);
	}

	.columns {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 10px 24px;
	}

	.columns h3 {
		margin: 0 0 4px;
		font-size: 1.15rem;
	}

	.columns ul {
		margin: 0;
		padding-left: 20px;
		display: grid;
		gap: 4px;
	}

	.by {
		margin: 18px 0 0;
		padding: 12px 14px;
		border: 1.5px dashed var(--line);
		border-radius: var(--sketchy);
	}
</style>
