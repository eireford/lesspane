<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<header class="site-header">
	<div class="wrap bar">
		<a href="/" class="brand" aria-label="LessPane home">
			<img src="/icons/icon-192.png" alt="" width="28" height="28" />
			<span>LessPane</span>
		</a>
		<a href="/quote" class="get-quote">Get a quote</a>
	</div>
</header>

<main class="wrap">
	{@render children()}
</main>

<footer class="wrap site-footer muted">
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

	.get-quote {
		font-weight: 650;
		text-decoration: none;
	}

	main {
		padding-top: 24px;
		padding-bottom: 40px;
	}

	.site-footer {
		font-size: 0.9rem;
		padding-bottom: calc(24px + env(safe-area-inset-bottom));
	}
</style>
