<script lang="ts">
	// A block of code or a raw request, with a copy button.
	let { code, label = '', maxHeight = '' }: { code: string; label?: string; maxHeight?: string } = $props();
	let copied = $state(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(code);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// Clipboard blocked: the text can still be selected by hand.
		}
	}
</script>

<div class="code">
	{#if label}<p class="label">{label}</p>{/if}
	<div class="box">
		<button class="copy" type="button" onclick={copy} aria-label="Copy {label || 'code'}">{copied ? 'Copied' : 'Copy'}</button>
		<pre style:max-height={maxHeight || undefined}><code>{code}</code></pre>
	</div>
</div>

<style>
	.code {
		min-width: 0;
	}

	.box {
		position: relative;
	}

	.label {
		margin: 0 0 4px;
		font-size: 0.82rem;
		font-weight: 650;
		color: var(--ink-soft);
	}

	pre {
		margin: 0;
		padding: 12px 14px;
		overflow: auto;
		border: 1.5px solid var(--ink);
		border-radius: 10px;
		background: #fbfaf6;
		font-size: 0.8rem;
		line-height: 1.45;
		white-space: pre;
	}

	.copy {
		position: absolute;
		top: 6px;
		right: 6px;
		padding: 2px 10px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--paper);
		color: var(--ink-soft);
		font: inherit;
		font-size: 0.78rem;
		cursor: pointer;
	}
</style>
