<script lang="ts">
	import { enhance } from '$app/forms';
	import { business, pricing, serviceLabels, timeWindowLabels } from '$lib/config';
	import { displayName, place } from '$lib/contact';
	import { formatUsd } from '$lib/pricing';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const received = (iso: string) =>
		new Date(iso).toLocaleString('en-US', {
			timeZone: business.timeZone,
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
</script>

<svelte:head>
	<title>Requests · LessPane admin</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if data.admin}
	<form method="POST" action="/auth/logout" class="who">
		<span class="muted">Signed in as {data.admin}</span>
		<button class="link" type="submit">Sign out</button>
	</form>
{/if}
<h1>Requests</h1>
<p class="muted">{data.requests.length} most recent, newest first.</p>

{#each data.requests as r (r.id)}
	<article class="card request">
		<header>
			<strong>{displayName(r)}</strong>
			<span class="badge status-{r.status}">{r.status}</span>
		</header>
		<p class="price-line">
			<strong>{formatUsd(r.quoted_price)}</strong> · {r.preferred_date}, {timeWindowLabels[
				r.preferred_window
			].toLowerCase()}
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
		<form method="POST" action="?/status" use:enhance class="status-form">
			<input type="hidden" name="id" value={r.id} />
			<select name="status" aria-label="Status for {displayName(r)}">
				{#each data.statuses as s}
					<option value={s} selected={s === r.status}>{s}</option>
				{/each}
			</select>
			<button class="btn ghost" type="submit">Update</button>
			<span class="muted small">Received {received(r.created_at)}</span>
		</form>
	</article>
{:else}
	<p class="card muted">No requests yet.</p>
{/each}

<style>
	.who {
		display: flex;
		justify-content: flex-end;
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

	.status-form {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-top: 10px;
	}

	select {
		min-height: 44px;
		padding: 0 10px;
		font: inherit;
		border: 1.5px solid var(--line);
		border-radius: 10px;
		background: var(--paper);
	}

	.status-form .btn {
		min-height: 44px;
	}

	.small {
		font-size: 0.85rem;
	}
</style>
