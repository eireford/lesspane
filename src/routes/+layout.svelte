<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { business } from '$lib/config';

	const showcase = business.showcase;

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

{#if showcase.enabled}
	<p class="showcase" role="note">
		<strong>Demo.</strong> A working prototype by
		<a href={showcase.builtByUrl}>{showcase.builtBy}</a>. Requests here are not real bookings.
	</p>
{/if}

<main class="wrap">
	{@render children()}
</main>

<footer class="wrap site-footer muted">
	{#if page.url.pathname !== '/' && !page.url.pathname.startsWith('/admin')}
		<!-- Back to the landing page with nothing chosen: a plain link drops the quote's query string and state -->
		<a class="start-over" href="/" data-sveltekit-reload><Icon name="undo" size={18} /> Start over</a>
	{/if}
	<p>LessPane · Eastern Shore, MD · <a href="mailto:{business.contactEmail}">{business.contactEmail}</a></p>
	{#if showcase.enabled}
		<p>
			Built by <a href={showcase.builtByUrl}>{showcase.builtBy}</a> ·
			<a href={showcase.sourceUrl}>Source on GitHub</a>
		</p>
	{/if}
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

	.showcase {
		margin: 0;
		padding: 8px 16px;
		background: var(--highlight);
		border-bottom: 1px solid var(--line);
		color: var(--ink);
		font-size: 0.9rem;
		text-align: center;
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
