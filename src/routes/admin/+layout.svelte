<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	const tabs = [
		{ href: '/admin', label: 'Requests' },
		{ href: '/admin/tests', label: 'Tests' }
	];
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="admin-bar" class:wide={page.url.pathname.startsWith('/admin/tests')}>
	<nav aria-label="Admin">
		{#each tabs as t (t.href)}
			<a href={t.href} aria-current={page.url.pathname === t.href ? 'page' : undefined}>{t.label}</a>
		{/each}
	</nav>
	{#if data.admin}
		<form method="POST" action="/auth/logout" class="who">
			<span class="muted">Signed in as {data.admin}</span>
			<button class="link" type="submit">Sign out</button>
		</form>
	{/if}
</div>

{@render children()}

<style>
	.admin-bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px 16px;
		margin-bottom: 12px;
	}

	nav {
		display: flex;
		gap: 4px;
		padding: 3px;
		border: 1.5px solid var(--ink);
		border-radius: 999px;
		background: var(--paper);
	}

	nav a {
		padding: 6px 16px;
		border-radius: 999px;
		color: var(--ink);
		font-weight: 650;
		text-decoration: none;
	}

	nav a[aria-current='page'] {
		background: var(--highlight);
	}

	.who {
		display: flex;
		gap: 10px;
		font-size: 0.9rem;
	}

	.who .link {
		border: 0;
		background: none;
		color: var(--lake);
		text-decoration: underline;
		cursor: pointer;
	}
</style>
