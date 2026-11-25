<script lang="ts">
	import type { Snippet } from 'svelte';
	import { business, pricing, serviceLabels, timeWindowLabels } from '#lib/config.ts';
	import { displayName, place } from '#lib/contact.ts';
	import { formatUsd } from '#lib/pricing.ts';
	import type { QuoteRequest } from '#lib/server/store.ts';

	// One booking request as the owner sees it: on /admin with a status form, and on the demo's owner view
	// (/demo) with sample requests. `children` is the status control under the details.
	let { r, children }: { r: QuoteRequest; children?: Snippet } = $props();

	const received = (iso: string) =>
		new Date(iso).toLocaleString('en-US', {
			timeZone: business.timeZone,
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
</script>

<article class="card request">
	<header>
		<strong>{displayName(r)}</strong>
		<span class="badge status-{r.status}">{r.status}</span>
	</header>
	<p class="price-line">
		<strong>{formatUsd(r.quoted_price)}</strong> · {r.preferred_date}, {timeWindowLabels[r.preferred_window].toLowerCase()}
	</p>
	<p>
		{place(r) || 'No address given'}<br />
		{r.stories}-story · ~{r.window_count} windows · {serviceLabels[r.service_type]}
		{#if r.add_ons.length}
			<br />Add-ons: {r.add_ons.map((a) => pricing.addOns[a].label).join(', ')}
		{/if}
	</p>
	<p>
		{#if r.phone}<a href="tel:{r.phone}">{r.phone}</a> · {/if}<a href="mailto:{r.email}">{r.email}</a>
	</p>
	{#if r.notes}<p class="muted">Notes: {r.notes}</p>{/if}
	<div class="controls">
		{@render children?.()}
		<span class="muted small">Received {received(r.created_at)}</span>
	</div>
</article>

<style>
	.request {
		margin-bottom: 12px;
	}

	.request p {
		margin: 6px 0;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.badge {
		font-size: 0.8rem;
		font-weight: 650;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		padding: 2px 10px;
		border-radius: 999px;
		background: var(--brand-soft);
		color: var(--brand);
	}

	.status-done {
		background: #ecfdf3;
		color: #067647;
	}

	.status-cancelled {
		background: #f2f4f7;
		color: #475467;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-top: 10px;
	}

	.controls :global(select) {
		min-height: 44px;
		padding: 0 10px;
		font: inherit;
		border: 1.5px solid var(--line);
		border-radius: 10px;
		background: var(--paper);
	}

	.controls :global(.btn) {
		min-height: 44px;
	}

	.small {
		font-size: 0.85rem;
	}
</style>
