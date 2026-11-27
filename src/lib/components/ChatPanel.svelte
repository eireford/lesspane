<script lang="ts" module>
	/** Any page can open the chat: `openChat()` (or dispatch this event). */
	export const OPEN_CHAT_EVENT = 'lesspane:open-chat';
	export function openChat(prompt?: string) {
		window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT, { detail: { prompt } }));
	}
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { assistant, business } from '#lib/config.ts';
	import { formatChat } from '#lib/chat-format.ts';

	// The chat assistant: a "Chat" button on every page that opens a panel. The conversation lives in the
	// browser (sessionStorage, so it survives moving between pages) and is sent whole to /api/chat each turn.

	type Message = { role: 'user' | 'model'; text: string };
	const STORAGE_KEY = 'lesspane-chat';
	const GREETING = business.showcase.enabled
		? "Hi! I can explain our window cleaning, estimate your price and book a visit. (This is a demo, so bookings aren't real.) What can I help with?"
		: 'Hi! I can explain our window cleaning, estimate your price and book a visit. What can I help with?';
	const SUGGESTIONS = ['How much for a two-story house?', "What's included?", 'Book a cleaning'];

	let open = $state(false);
	let messages = $state<Message[]>(load());
	let input = $state('');
	let sending = $state(false);
	let problem = $state('');
	let log = $state<HTMLDivElement>();
	let field = $state<HTMLTextAreaElement>();

	function load(): Message[] {
		try {
			const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]');
			return Array.isArray(saved) ? saved : [];
		} catch {
			return [];
		}
	}

	$effect(() => {
		try {
			sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
		} catch {
			// Private windows and blocked storage: the chat still works, it just isn't kept between pages.
		}
	});

	async function scrollDown() {
		await tick();
		log?.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
	}

	async function show(prompt?: string) {
		open = true;
		if (prompt) input = prompt;
		await scrollDown();
		field?.focus();
	}

	$effect(() => {
		const handler = (e: Event) => show((e as CustomEvent<{ prompt?: string }>).detail?.prompt);
		window.addEventListener(OPEN_CHAT_EVENT, handler);
		return () => window.removeEventListener(OPEN_CHAT_EVENT, handler);
	});

	async function send(text = input) {
		text = text.trim();
		if (!text || sending) return;
		problem = '';
		input = '';
		messages = [...messages, { role: 'user', text }];
		sending = true;
		scrollDown();
		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ messages })
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok || typeof data.reply !== 'string') {
				throw new Error(typeof data.error === 'string' ? data.error : "The assistant isn't available right now.");
			}
			messages = [...messages, { role: 'model', text: data.reply }];
		} catch (e) {
			// Take the message back so it can be sent again, and say what went wrong.
			messages = messages.slice(0, -1);
			input = text;
			problem =
				e instanceof TypeError
					? 'Could not reach the assistant. Check your connection and try again.'
					: (e as Error).message;
		} finally {
			sending = false;
			await scrollDown();
			field?.focus();
		}
	}

	function restart() {
		messages = [];
		problem = '';
		input = '';
		field?.focus();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}
</script>

<svelte:window onkeydown={(e) => open && e.key === 'Escape' && (open = false)} />

{#if open}
	<div class="panel" role="dialog" aria-modal="false" aria-labelledby="chat-title">
		<header>
			<h2 id="chat-title"><Icon name="chat" size={20} /> Ask LessPane</h2>
			{#if messages.length}
				<button type="button" class="ghost" onclick={restart}>New chat</button>
			{/if}
			<button type="button" class="ghost close" onclick={() => (open = false)} aria-label="Close chat">
				<Icon name="x" size={20} />
			</button>
		</header>

		<div class="log" bind:this={log} aria-live="polite">
			<div class="msg model">{GREETING}</div>
			{#each messages as m, i (i)}
				<div class="msg {m.role}">
					{#if m.role === 'user'}
						{m.text}
					{:else}
						{#each formatChat(m.text) as block, b (b)}
							{#if block.kind === 'ul'}
								<ul>
									{#each block.items as item, j (j)}
										<li>
											{#each item as part, k (k)}{#if part.kind === 'bold'}<strong>{part.text}</strong>{:else if part.kind === 'em'}<em>{part.text}</em>{:else if part.kind === 'link'}<a href={part.href} target={part.href.startsWith(location.origin) ? undefined : '_blank'} rel="noopener noreferrer">{part.text}</a>{:else}{part.text}{/if}{/each}
										</li>
									{/each}
								</ul>
							{:else}
								<p>
									{#each block.parts as part, k (k)}{#if part.kind === 'bold'}<strong>{part.text}</strong>{:else if part.kind === 'em'}<em>{part.text}</em>{:else if part.kind === 'link'}<a href={part.href} target={part.href.startsWith(location.origin) ? undefined : '_blank'} rel="noopener noreferrer">{part.text}</a>{:else}{part.text}{/if}{/each}
								</p>
							{/if}
						{/each}
					{/if}
				</div>
			{/each}
			{#if sending}
				<div class="msg model typing" aria-label="The assistant is typing"><span></span><span></span><span></span></div>
			{/if}
			{#if !messages.length && !sending}
				<div class="suggestions">
					{#each SUGGESTIONS as s (s)}
						<button type="button" onclick={() => send(s)}>{s}</button>
					{/each}
				</div>
			{/if}
		</div>

		{#if problem}
			<p class="problem" role="alert">{problem}</p>
		{/if}

		<form
			onsubmit={(e) => {
				e.preventDefault();
				send();
			}}
		>
			<textarea
				bind:this={field}
				bind:value={input}
				onkeydown={onKeydown}
				rows="1"
				maxlength={assistant.maxMessageChars}
				placeholder="Ask about prices, what's included, or book a time"
				aria-label="Your message"
			></textarea>
			<button type="submit" class="send" disabled={sending || !input.trim()} aria-label="Send">
				<Icon name="send" size={20} />
			</button>
		</form>
	</div>
{:else}
	<button type="button" class="launcher" onclick={() => show()} aria-label="Chat with LessPane">
		<Icon name="chat" size={22} /> <span>Ask us</span>
	</button>
{/if}

<style>
	.launcher {
		position: fixed;
		right: 16px;
		bottom: calc(16px + env(safe-area-inset-bottom));
		z-index: 30;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		min-height: 48px;
		padding: 0 18px;
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--brand);
		color: var(--brand-ink);
		box-shadow: var(--shadow);
		font-family: var(--hand);
		font-size: 1.2rem;
		cursor: pointer;
	}

	/* On phones the labelled button covered prices and controls (the estimate, the time slider) as people
	   scrolled; a round icon button covers far less. The aria-label still names it. */
	@media (max-width: 520px) {
		.launcher {
			width: 52px;
			height: 52px;
			min-height: 0;
			padding: 0;
			justify-content: center;
			border-radius: 50%;
		}

		.launcher span {
			display: none;
		}
	}

	.panel {
		position: fixed;
		right: 16px;
		bottom: calc(16px + env(safe-area-inset-bottom));
		z-index: 30;
		width: min(400px, calc(100vw - 32px));
		height: min(600px, calc(100dvh - 96px));
		display: flex;
		flex-direction: column;
		background: var(--paper);
		border: 2px solid var(--ink);
		border-radius: 14px;
		box-shadow: 4px 6px 0 rgb(43 42 38 / 0.15);
	}

	@media (max-width: 520px) {
		.panel {
			inset: 0;
			width: 100%;
			height: 100dvh;
			border: none;
			border-radius: 0;
			padding-top: env(safe-area-inset-top);
			padding-bottom: env(safe-area-inset-bottom);
		}
	}

	header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px 10px 16px;
		border-bottom: 1px solid var(--line);
	}

	h2 {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		margin-right: auto;
		font-size: 1.4rem;
	}

	.ghost {
		display: inline-flex;
		align-items: center;
		min-height: 40px;
		padding: 0 10px;
		border: none;
		background: none;
		color: var(--ink-soft);
		font: inherit;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.ghost:hover {
		color: var(--ink);
	}

	.log {
		flex: 1;
		overflow-y: auto;
		padding: 14px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.msg {
		max-width: 88%;
		padding: 9px 13px;
		border-radius: 14px;
		line-height: 1.45;
		overflow-wrap: anywhere;
	}

	.msg.model {
		align-self: flex-start;
		background: var(--glass);
		border-bottom-left-radius: 4px;
	}

	.msg.user {
		align-self: flex-end;
		background: var(--brand-soft);
		border-bottom-right-radius: 4px;
		white-space: pre-wrap;
	}

	.msg p {
		margin: 0;
	}

	.msg p + p,
	.msg p + ul,
	.msg ul + p {
		margin-top: 8px;
	}

	.msg ul {
		margin: 0;
		padding-left: 20px;
	}

	.typing {
		display: flex;
		gap: 5px;
		padding: 14px 16px;
	}

	.typing span {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--water);
		animation: bounce 1s infinite ease-in-out;
	}

	.typing span:nth-child(2) {
		animation-delay: 0.15s;
	}

	.typing span:nth-child(3) {
		animation-delay: 0.3s;
	}

	@keyframes bounce {
		0%,
		80%,
		100% {
			transform: translateY(0);
			opacity: 0.5;
		}
		40% {
			transform: translateY(-5px);
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.typing span {
			animation: none;
		}
	}

	.suggestions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 4px;
	}

	.suggestions button {
		min-height: 40px;
		padding: 6px 12px;
		border: 1.5px dashed var(--ink-soft);
		border-radius: var(--sketchy);
		background: var(--paper);
		color: var(--ink);
		font: inherit;
		font-size: 0.95rem;
		cursor: pointer;
	}

	.suggestions button:hover {
		border-color: var(--ink);
		background: var(--highlight);
	}

	.problem {
		margin: 0 14px 8px;
		padding: 8px 12px;
		border-radius: 10px;
		background: #fbe9e5;
		color: var(--danger);
		font-size: 0.92rem;
	}

	form {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		padding: 10px 12px 12px;
		border-top: 1px solid var(--line);
	}

	textarea {
		flex: 1;
		min-height: 44px;
		max-height: 140px;
		padding: 10px 12px;
		border: 1.5px solid var(--line);
		border-radius: 12px;
		font: inherit;
		font-size: 16px; /* 16px stops iOS zooming in on focus */
		resize: none;
		field-sizing: content;
	}

	textarea:focus {
		outline: 2px solid var(--brand);
		outline-offset: 1px;
		border-color: transparent;
	}

	.send {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border: 2px solid var(--ink);
		border-radius: 50%;
		background: var(--brand);
		color: var(--brand-ink);
		cursor: pointer;
	}

	.send:disabled {
		opacity: 0.5;
		cursor: default;
	}
</style>
