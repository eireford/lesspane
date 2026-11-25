<script lang="ts">
	import { agents, business } from '#lib/config.ts';
	import { callTool, tooManyText, type Exchange, type Protocol, type ToolInfo } from '#lib/agent-client.ts';
	import { dayText, scenarios, type Ctx, type Maker, type Step } from '#lib/agent-demo.ts';
	import Icon from '#lib/components/Icon.svelte';
	import CodeBlock from './CodeBlock.svelte';

	// A conversation between a person and their own assistant, step by step. The words are scripted; every
	// read-only tool call goes to this site for real, and the assistant's replies use what came back.
	let { origin, tools, makers, maker = $bindable() }: { origin: string; tools: ToolInfo[]; makers: Maker[]; maker: string } = $props();

	let scenarioId = $state(scenarios[0].id);
	let protocol = $state<Protocol>('mcp');
	let shown = $state<{ step: Step; text?: string; args?: Record<string, unknown>; exchange?: Exchange; example?: Record<string, unknown>; error?: string }[]>([]);
	let busy = $state(false);
	let playing = $state(false);
	// What the tools answered so far, for the replies that follow (not shown directly, so not reactive).
	const results: Ctx['results'] = {};

	const scenario = $derived(scenarios.find((s) => s.id === scenarioId)!);
	const m = $derived(makers.find((x) => x.id === maker) ?? makers[0]);
	const finished = $derived(shown.length >= scenario.steps.length);
	const ctx = (): Ctx => ({ origin, maker: m, results });

	function restart() {
		playing = false;
		shown = [];
		for (const k of Object.keys(results)) delete results[k];
	}

	// A new assistant, scenario or protocol starts the conversation over.
	$effect(() => {
		void [scenarioId, protocol, maker];
		restart();
	});

	async function next() {
		if (busy || finished) return;
		busy = true;
		const step = scenario.steps[shown.length];
		try {
			if (step.kind === 'person' || step.kind === 'assistant' || step.kind === 'approve') {
				shown.push({ step, text: step.text(ctx()) });
			} else if (step.kind === 'call') {
				const args = step.args(ctx());
				if (step.live) {
					const tool = tools.find((t) => t.name === step.tool)!;
					const exchange = await callTool(protocol, tool, args);
					if (exchange.status === 429) {
						shown.push({ step, args, exchange, error: tooManyText });
						playing = false;
					} else {
						if (exchange.result) results[step.key] = exchange.result;
						shown.push({ step, args, exchange });
					}
				} else {
					const example = step.example(ctx());
					results[step.key] = example;
					shown.push({ step, args, example });
				}
			} else {
				shown.push({ step });
			}
		} catch (e) {
			shown.push({ step, error: `The call failed: ${e instanceof Error ? e.message : e}` });
			playing = false;
		} finally {
			busy = false;
		}
		// Keep the newest message in view.
		requestAnimationFrame(() => document.getElementById(`replay-${shown.length - 1}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
	}

	async function playAll() {
		if (finished) restart();
		playing = true;
		while (playing && !finished) {
			await next();
			await new Promise((r) => setTimeout(r, 900));
		}
		playing = false;
	}
</script>

<div class="controls">
	<label>
		Assistant
		<select bind:value={maker}>
			{#each makers as x (x.id)}<option value={x.id}>{x.assistant} ({x.maker})</option>{/each}
		</select>
	</label>
	<label>
		Talks to LessPane over
		<select bind:value={protocol}>
			<option value="mcp">MCP (/mcp)</option>
			<option value="http">HTTP API (/api/v1)</option>
		</select>
	</label>
</div>

<div class="scenarios" role="radiogroup" aria-label="Conversation">
	{#each scenarios as s (s.id)}
		<label class="scenario" class:on={scenarioId === s.id}>
			<input type="radio" name="scenario" value={s.id} bind:group={scenarioId} />
			<strong>{s.name}</strong>
			<span>{s.blurb}</span>
		</label>
	{/each}
</div>

<div class="chat card" aria-live="polite">
	<p class="chat-head">
		<span><strong>You</strong> and <strong>{m.assistant}</strong>, with LessPane connected</span>
		<span class="muted">{shown.length} / {scenario.steps.length}</span>
	</p>

	{#each shown as item, i (i)}
		{@const step = item.step}
		<div id="replay-{i}" class="item {step.kind}">
			{#if step.kind === 'person'}
				<p class="bubble you"><span class="who">You</span>{item.text}</p>
			{:else if step.kind === 'assistant'}
				<p class="bubble bot"><span class="who">{m.assistant}</span>{item.text}</p>
			{:else if step.kind === 'approve'}
				<p class="system"><Icon name="hand" size={16} /> {item.text}</p>
			{:else if step.kind === 'call'}
				<div class="call">
					<p class="call-head">
						<Icon name="send" size={16} />
						<span>{m.assistant} calls <code>{step.tool}</code></span>
						{#if step.live}
							<span class="tag live">Live · {item.exchange?.status} · {item.exchange?.ms} ms</span>
						{:else}
							<span class="tag example">Example, not sent</span>
						{/if}
					</p>
					{#if !step.live}<p class="why">{step.why}</p>{/if}
					{#if item.error}<p class="error" role="alert">{item.error}</p>{/if}
					<div class="pair">
						{#if item.exchange}
							<CodeBlock label="Request" code={item.exchange.request} maxHeight="240px" />
							<CodeBlock label="LessPane answers" code={JSON.stringify(item.exchange.body, null, 2)} maxHeight="240px" />
						{:else if item.example}
							<CodeBlock label="Request (arguments)" code={JSON.stringify(item.args, null, 2)} maxHeight="240px" />
							<CodeBlock label="LessPane would answer" code={JSON.stringify(item.example, null, 2)} maxHeight="240px" />
						{/if}
					</div>
				</div>
			{:else if step.kind === 'email'}
				{@const date = step.date(ctx())}
				<div class="email">
					<p class="email-head"><Icon name="mail" size={16} /> Meanwhile, in Sam's inbox (the assistant never sees this)</p>
					<p><strong>To:</strong> {step.to}<br /><strong>Subject:</strong> Please confirm: window cleaning on {date}</p>
					<p>
						Your AI assistant ({m.agentName}) asked {business.name} to clean your windows. Nothing is booked until you
						confirm: {dayText(date)}, morning, {results.quote?.total_text ?? ''}.
					</p>
					<p>Confirm it, or tell us it wasn't you ({agents.confirmHours} hours, then it lapses): <span class="fake-link">{origin}/confirm/…</span></p>
					<p class="muted">
						The link opens a page with two buttons, <strong>Yes, book it</strong> and <strong>No, this wasn't me</strong>. Opening
						it changes nothing, so a mail scanner can't confirm by accident.
					</p>
				</div>
			{:else if step.kind === 'owner'}
				<div class="owner">
					<p>
						<Icon name="user" size={16} /> <strong>On the owner's side</strong>, the request is marked as from an AI agent
						("{m.agentName}"), dimmed and kept off the calendar until Sam confirms. Then it is an ordinary request, with a
						Call button: at first, the owner phones the customer to check every agent booking.
					</p>
					<a href="/owner">See the owner's side</a>
				</div>
			{/if}
		</div>
	{:else}
		<p class="empty muted">Press <strong>Next step</strong> or <strong>Play</strong>. Each tool call goes to this site as it happens.</p>
	{/each}

	<div class="buttons">
		<button class="btn" onclick={next} disabled={busy || playing || finished}>
			<Icon name="right" size={18} /> Next step
		</button>
		<button class="btn ghost" onclick={() => (playing ? (playing = false) : playAll())} disabled={busy && !playing}>
			{playing ? 'Pause' : finished ? 'Play again' : 'Play'}
		</button>
		<button class="btn ghost" onclick={restart} disabled={!shown.length}><Icon name="undo" size={18} /> Restart</button>
	</div>
</div>

<style>
	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 10px 18px;
		margin-bottom: 10px;
	}

	.controls label {
		display: grid;
		gap: 2px;
		font-size: 0.85rem;
		font-weight: 650;
	}

	select {
		min-height: 40px;
		padding: 4px 10px;
		border: 1.5px solid var(--ink);
		border-radius: 10px;
		background: var(--paper);
		font: inherit;
		font-weight: 400;
	}

	.scenarios {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
		gap: 8px;
		margin-bottom: 12px;
	}

	.scenario {
		display: grid;
		gap: 2px;
		padding: 8px 12px;
		border: 1.5px solid var(--line);
		border-radius: 12px;
		cursor: pointer;
	}

	.scenario input {
		position: absolute;
		opacity: 0;
	}

	.scenario span {
		font-size: 0.85rem;
		color: var(--ink-soft);
	}

	.scenario.on {
		border-color: var(--ink);
		background: var(--highlight);
	}

	.scenario:has(input:focus-visible) {
		outline: 3px solid color-mix(in srgb, var(--brand) 35%, transparent);
	}

	.chat {
		display: grid;
		gap: 12px;
	}

	.chat-head {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		margin: 0;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--line);
		font-size: 0.9rem;
	}

	.bubble {
		max-width: 80%;
		margin: 0;
		padding: 8px 12px;
		border-radius: 14px;
	}

	.who {
		display: block;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--ink-soft);
	}

	.you {
		margin-left: auto;
		background: var(--glass);
		border-bottom-right-radius: 4px;
	}

	.bot {
		background: var(--brand-soft);
		border-bottom-left-radius: 4px;
	}

	.system {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0;
		font-size: 0.88rem;
		color: var(--ink-soft);
		font-style: italic;
	}

	.call,
	.email,
	.owner {
		padding: 10px 12px;
		border: 1.5px dashed var(--line);
		border-radius: 12px;
	}

	.call-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px 8px;
		margin: 0 0 8px;
		font-size: 0.92rem;
	}

	.tag {
		padding: 1px 8px;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 700;
	}

	.tag.live {
		background: var(--brand-soft);
		color: #1d5e45;
	}

	.tag.example {
		background: var(--highlight);
	}

	.why {
		margin: 0 0 8px;
		font-size: 0.85rem;
		color: var(--ink-soft);
	}

	.pair {
		display: grid;
		gap: 10px;
	}

	@media (min-width: 760px) {
		.pair {
			grid-template-columns: 1fr 1fr;
		}
	}

	.email {
		background: #fffdf3;
	}

	.email p,
	.owner p {
		margin: 0 0 6px;
		font-size: 0.92rem;
	}

	.email-head {
		display: flex;
		align-items: center;
		gap: 6px;
		font-weight: 650;
	}

	.fake-link {
		color: var(--lake);
		text-decoration: underline;
		overflow-wrap: anywhere;
	}

	.error {
		color: var(--danger);
		margin: 0 0 8px;
	}

	.empty {
		margin: 0;
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		padding-top: 8px;
		border-top: 1px solid var(--line);
	}
</style>
