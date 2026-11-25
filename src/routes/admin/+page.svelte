<script lang="ts">
	import { enhance } from '$app/forms';
	import RequestCard from '#lib/components/RequestCard.svelte';
	import { displayName } from '#lib/contact.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
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
	<RequestCard {r}>
		{#if r.status === 'awaiting_customer'}
			<span class="muted">Nothing to do until the customer confirms.</span>
		{:else}
			<form method="POST" action="?/status" use:enhance class="status-form">
				<input type="hidden" name="id" value={r.id} />
				<select name="status" aria-label="Status for {displayName(r)}">
					{#each data.statuses as s}
						<option value={s} selected={s === r.status}>{s}</option>
					{/each}
				</select>
				<button class="btn ghost" type="submit">Update</button>
			</form>
			{#if r.source === 'agent' && r.status !== 'cancelled'}
				{#if r.phone}<a class="btn ghost call" href="tel:{r.phone}">Call</a>{/if}
				<form method="POST" action="?/checked" use:enhance class="checked">
					<input type="hidden" name="id" value={r.id} />
					<label>
						<input type="checkbox" name="checked" checked={!!r.phone_checked_at} onchange={(e) => e.currentTarget.form?.requestSubmit()} />
						Checked by phone
					</label>
					<noscript><button class="btn ghost" type="submit">Save</button></noscript>
				</form>
			{/if}
		{/if}
	</RequestCard>
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

	.status-form {
		display: contents;
	}

	.call {
		min-height: 44px;
	}

	.checked label {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-height: 44px;
	}
</style>
