<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import { business, timeWindowLabels } from '#lib/config.ts';
	import { formatUsd } from '#lib/pricing.ts';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const prettyDate = (iso: string) =>
		new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});
</script>

<svelte:head>
	<title>Request sent · LessPane</title>
</svelte:head>

<section class="card stack">
	<p class="check" aria-hidden="true">✓</p>
	{#if data.summary}
		<h1>Thanks{data.summary.firstName ? `, ${data.summary.firstName}` : ''}. You're on the list.</h1>
		<p>
			We got your request for <strong>{prettyDate(data.summary.date)}</strong>,
			{timeWindowLabels[data.summary.window].toLowerCase()}, at
			<strong>{formatUsd(data.summary.total)}</strong>.
		</p>
		<p class="muted">
			A copy is on its way to {data.summary.email}.
			{business.showcase.enabled
				? 'This is a demo, so no one will come to clean.'
				: "We'll be in touch to confirm the exact time."}
		</p>
		{#if data.manageUrl}
			<a class="btn block ghost" href={data.manageUrl}>Change the day or cancel</a>
			<p class="muted small">The same private link is in your email. No account needed.</p>
		{/if}
	{:else}
		<h1>Request received</h1>
		<p class="muted">
			{business.showcase.enabled
				? 'This is a demo, so no one will come to clean.'
				: "We'll be in touch to confirm the exact time."}
		</p>
	{/if}
	<a class="btn ghost block" href="/">Start another house</a>
</section>

{#if data.owner}
	<section class="owner" aria-labelledby="owner-got">
		<h2 id="owner-got"><Icon name="mail" size={22} /> Meanwhile, what the owner got</h2>
		<p class="muted">
			In the live business, these reach the owner the moment you book: an email alert, and a tentative event on
			their Google Calendar that turns solid when they confirm.
		</p>
		<div class="mail">
			<p class="head"><strong>{data.owner.alert.subject}</strong><br />To: the owner · Reply-To: {data.owner.alert.replyTo}</p>
			<pre>{data.owner.alert.text}</pre>
		</div>
		<div class="event" data-status={data.owner.event.status}>
			<Icon name="calendar" size={20} />
			<span>
				<strong>{data.owner.event.summary}</strong>
				<small>{data.summary ? timeWindowLabels[data.summary.window] : ''}{data.owner.event.location ? ` · ${data.owner.event.location}` : ''} · {data.owner.event.status}</small>
			</span>
		</div>
		<a class="btn block" href="/owner">See the owner's whole side <Icon name="right" size={20} /></a>
	</section>
{/if}

<style>
	.owner {
		margin-top: 24px;
		display: grid;
		gap: 12px;
	}

	.owner h2 {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		font-size: 1.45rem;
	}

	.owner h2 :global(svg) {
		color: var(--coral);
	}

	.owner > p {
		margin: 0;
		font-size: 0.92rem;
	}

	.mail {
		border: 1.5px solid var(--ink);
		border-radius: 10px;
		background: var(--paper);
	}

	.head {
		margin: 0;
		padding: 10px 12px 6px;
		border-bottom: 1px dashed var(--line);
		font-size: 0.85rem;
		color: var(--ink-soft);
	}

	.head strong {
		color: var(--ink);
		font-size: 0.95rem;
	}

	pre {
		margin: 0;
		padding: 10px 12px 12px;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 0.8rem;
		line-height: 1.5;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.event {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		border: 2px dashed var(--lake);
		border-left: 6px solid var(--lake);
		border-radius: 10px;
		color: var(--lake);
	}

	.event span {
		display: grid;
		color: var(--ink);
		line-height: 1.3;
	}

	.event small {
		color: var(--ink-soft);
	}

	.small {
		margin: 0;
		font-size: 0.85rem;
		text-align: center;
	}

	.check {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		margin: 0;
		font-size: 1.8rem;
		font-weight: 800;
		color: var(--brand-ink);
		background: var(--brand);
	}
</style>
