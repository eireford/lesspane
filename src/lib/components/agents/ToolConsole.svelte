<script lang="ts">
	import { callTool, curlFor, tooManyText, type Exchange, type Protocol, type ToolInfo } from '#lib/agent-client.ts';
	import CodeBlock from './CodeBlock.svelte';

	// Call LessPane's read-only tools by hand, over MCP or HTTP, and see the exact request, answer and curl command.
	let { origin, tools }: { origin: string; tools: ToolInfo[] } = $props();

	const examples: Record<string, Record<string, unknown>> = {
		get_business_info: {},
		check_service_area: { zip: '21601' },
		get_quote: { windows: 18, stories: 1, service: 'interior_exterior', addons: ['screens'] }
	};
	const usable = $derived(tools.filter((t) => t.readOnly && t.name in examples));
	const others = $derived(tools.filter((t) => !usable.includes(t)));

	let name = $state('get_quote');
	let protocol = $state<Protocol>('mcp');
	let argsText = $state(JSON.stringify(examples.get_quote, null, 2));
	let exchange = $state<Exchange | null>(null);
	let error = $state('');
	let busy = $state(false);

	const tool = $derived(tools.find((t) => t.name === name)!);
	const parsed = $derived.by(() => {
		try {
			const v = JSON.parse(argsText || '{}');
			return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
		} catch {
			return null;
		}
	});

	function pick(n: string) {
		name = n;
		argsText = JSON.stringify(examples[n] ?? {}, null, 2);
		exchange = null;
		error = '';
	}

	async function send() {
		if (!parsed) return;
		busy = true;
		error = '';
		try {
			exchange = await callTool(protocol, tool, parsed);
			if (exchange.status === 429) error = tooManyText;
		} catch (e) {
			error = `The call failed: ${e instanceof Error ? e.message : e}`;
		} finally {
			busy = false;
		}
	}
</script>

<div class="console card">
	<div class="row">
		<label>
			Tool
			<select value={name} onchange={(e) => pick(e.currentTarget.value)}>
				{#each usable as t (t.name)}<option value={t.name}>{t.name}: {t.title}</option>{/each}
			</select>
		</label>
		<label>
			Over
			<select bind:value={protocol}>
				<option value="mcp">MCP: tools/call on /mcp</option>
				<option value="http">HTTP: {tool.http.method} /api/v1{tool.http.path}</option>
			</select>
		</label>
	</div>
	<p class="desc muted">{tool.description}</p>

	<label class="args">
		Arguments (JSON)
		<textarea bind:value={argsText} rows="6" spellcheck="false" aria-invalid={!parsed}></textarea>
	</label>
	{#if !parsed}<p class="error">That isn't a JSON object yet.</p>{/if}

	<div class="row">
		<button class="btn" onclick={send} disabled={busy || !parsed}>{busy ? 'Sending…' : 'Send it'}</button>
		<span class="muted small">Try a ZIP outside Maryland, 300 windows, or a package that doesn't exist: refusals come back with a code and a message saying what to do.</span>
	</div>

	{#if error}<p class="error" role="alert">{error}</p>{/if}
	{#if exchange}
		<p class="status">
			<span class="tag" class:bad={exchange.refused}>{exchange.refused ? 'Refused' : 'OK'} · HTTP {exchange.status} · {exchange.ms} ms</span>
		</p>
		<div class="pair">
			<CodeBlock label="Request" code={exchange.request} maxHeight="300px" />
			<CodeBlock label="Answer" code={JSON.stringify(exchange.body, null, 2)} maxHeight="300px" />
		</div>
	{/if}
	{#if parsed}
		<CodeBlock label="The same call with curl" code={curlFor(protocol, origin, tool, parsed)} />
	{/if}

	<p class="muted small">
		Not here: {others.map((t) => t.name).join(', ')}. They make, read or change a booking, which needs a real email
		address; try them from your own assistant, the API, or the conversation above.
	</p>
</div>

<style>
	.console {
		display: grid;
		gap: 10px;
		min-width: 0;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 16px;
	}

	label {
		display: grid;
		gap: 2px;
		font-size: 0.85rem;
		font-weight: 650;
	}

	select,
	textarea {
		min-height: 40px;
		padding: 6px 10px;
		border: 1.5px solid var(--ink);
		border-radius: 10px;
		background: var(--paper);
		font: inherit;
		font-weight: 400;
	}

	textarea {
		font-family: ui-monospace, monospace;
		font-size: 0.85rem;
		resize: vertical;
	}

	textarea[aria-invalid='true'] {
		border-color: var(--danger);
	}

	.desc {
		margin: 0;
		font-size: 0.9rem;
	}

	.small {
		font-size: 0.85rem;
	}

	.error {
		margin: 0;
		color: var(--danger);
	}

	.status {
		margin: 0;
	}

	.tag {
		padding: 2px 10px;
		border-radius: 999px;
		font-size: 0.8rem;
		font-weight: 700;
		background: var(--brand-soft);
		color: #1d5e45;
	}

	.tag.bad {
		background: #f7d9d2;
		color: var(--danger);
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
</style>
