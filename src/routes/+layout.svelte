<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<header class="site-header">
	<div class="wrap bar">
		<a href="/" class="brand" aria-label="LessPane home">
			<img src="/icon.svg" alt="" width="30" height="30" />
			<span>LessPane</span>
		</a>
		<span class="tagline">Eastern Shore window cleaning</span>
	</div>
</header>

<main class="wrap">
	{@render children()}
</main>

<footer class="wrap site-footer muted">
	{#if page.url.pathname !== '/' && !page.url.pathname.startsWith('/admin')}
		<!-- Back to the landing page with nothing chosen: a plain link drops the quote's query string and state -->
		<a class="start-over" href="/" data-sveltekit-reload><Icon name="undo" size={18} /> Start over</a>
	{/if}
	<p>LessPane · Eastern Shore, MD · <a href="mailto:hello@lesspane.com">hello@lesspane.com</a></p>
</footer>

<style>
	.site-header {
		background: var(--paper);
		border-bottom: 1px solid var(--line);
		position: sticky;
		top: 0;
		z-index: 10;
		padding-top: env(safe-area-inset-top);
	}

	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 60px;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		font-weight: 750;
		font-size: 1.15rem;
		color: var(--ink);
		text-decoration: none;
	}

	.brand img {
		border-radius: 7px;
	}

	.tagline {
		font-size: 0.85rem;
		color: var(--ink-soft);
	}

	main {
		padding-top: 24px;
		padding-bottom: 40px;
	}

	.site-footer {
		font-size: 0.9rem;
		padding-bottom: calc(24px + env(safe-area-inset-bottom));
	}

	.start-over {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		margin: 8px 0 18px;
		padding: 10px;
		border: 1.5px dashed var(--line);
		border-radius: var(--sketchy);
		font-family: var(--hand);
		font-size: 1.2rem;
		color: var(--ink-soft);
		text-decoration: none;
	}

	.start-over:hover {
		color: var(--ink);
		border-color: var(--ink);
	}
</style>
