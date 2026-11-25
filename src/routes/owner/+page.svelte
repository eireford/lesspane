<script lang="ts">
	import Icon, { type IconName } from '#lib/components/Icon.svelte';
	import RequestCard from '#lib/components/RequestCard.svelte';
	import { eventBody } from '#lib/calendar-event.ts';
	import { business, timeWindowLabels } from '#lib/config.ts';
	import { displayName } from '#lib/contact.ts';
	import { formatUsd } from '#lib/pricing.ts';
	import { addDaysIso, todayIso } from '#lib/validation.ts';
	import type { RequestStatus } from '#lib/server/store.ts';
	import type { PageData } from './$types';

	// The demo's owner view. Statuses change in this page only (nothing is saved), and the calendar follows them
	// the way the real Google Calendar sync does: tentative until confirmed, gone when cancelled.
	let { data }: { data: PageData } = $props();

	type Tab = 'requests' | 'calendar' | 'inbox';
	const tabs: { id: Tab; label: string; icon: IconName }[] = [
		{ id: 'requests', label: 'Requests', icon: 'note' },
		{ id: 'calendar', label: 'Calendar', icon: 'calendar' },
		{ id: 'inbox', label: 'Inbox', icon: 'mail' }
	];
	let tab = $state<Tab>('requests');

	// Local copies of each status, so a change shows everywhere on the page.
	let statuses = $state<Record<string, RequestStatus>>({});
	const requests = $derived(data.requests.map((r) => ({ ...r, status: statuses[r.id] ?? r.status })));

	const waiting = $derived(requests.filter((r) => r.status === 'new').length);
	const confirmed = $derived(requests.filter((r) => r.status === 'confirmed'));
	const booked = $derived(confirmed.reduce((sum, r) => sum + r.quoted_price, 0));

	// The next seven days, each with its calendar events, mornings first.
	const today = todayIso();
	const week = $derived(
		Array.from({ length: 7 }, (_, i) => {
			const day = addDaysIso(today, i);
			const events = requests
				.filter((r) => r.preferred_date === day && (r.status === 'new' || r.status === 'confirmed'))
				.sort((a, b) => Number(a.preferred_window === 'afternoon') - Number(b.preferred_window === 'afternoon'))
				.map((r) => ({ id: r.id, window: r.preferred_window, ...eventBody(r, data.origin) }));
			return { day, events };
		})
	);

	const dayLabel = (iso: string, i: number) =>
		i === 0
			? 'Today'
			: i === 1
				? 'Tomorrow'
				: new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

	const when = (iso: string) =>
		new Date(iso).toLocaleString('en-US', { timeZone: business.timeZone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

	const hours = { morning: '8–12', afternoon: '12–5' } as const;
</script>

<svelte:head>
	<title>The owner's side · LessPane demo</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="intro">
	<p class="step">Demo · the owner's side</p>
	<h1>Bookings that land ready to go.</h1>
	<p>
		Every request arrives priced, with the house described side by side, as an email alert and an event on the
		owner's Google Calendar. The owner confirms with one tap; the customer changes or cancels from their own link.
	</p>
	<p class="note" role="note">
		<Icon name="info" size={18} />
		<span>
			Made-up sample requests, drawn by the same code as the real owner page, calendar and emails. Changes here
			aren't saved and nothing is sent. The real page is behind Google sign-in.
		</span>
	</p>
</section>

<dl class="stats">
	<div><dt>To confirm</dt><dd>{waiting}</dd></div>
	<div><dt>Confirmed</dt><dd>{confirmed.length}</dd></div>
	<div><dt>Confirmed work</dt><dd>{formatUsd(booked)}</dd></div>
</dl>

<div class="tabs" role="tablist" aria-label="Owner's view">
	{#each tabs as t (t.id)}
		<button
			type="button"
			role="tab"
			id="tab-{t.id}"
			aria-selected={tab === t.id}
			aria-controls="panel-{t.id}"
			class:on={tab === t.id}
			onclick={() => (tab = t.id)}
		>
			<Icon name={t.icon} size={18} />
			{t.label}
			{#if t.id === 'requests' && waiting}<span class="count">{waiting}</span>{/if}
		</button>
	{/each}
</div>

{#if tab === 'requests'}
	<div id="panel-requests" role="tabpanel" aria-labelledby="tab-requests" tabindex="0" class="panel">
		<p class="muted hint">Newest first. Try confirming one, then look at the calendar.</p>
		{#each requests as r (r.id)}
			<RequestCard {r}>
				{#if r.status === 'awaiting_customer'}
					<span class="muted">Nothing to do until the customer confirms.</span>
				{:else}
				<select
					aria-label="Status for {displayName(r)}"
					value={r.status}
					onchange={(e) => (statuses[r.id] = e.currentTarget.value as RequestStatus)}
				>
					{#each data.statuses as s}
						<option value={s}>{s}</option>
					{/each}
				</select>
				{#if r.status === 'new'}
					<button type="button" class="btn ghost confirm" onclick={() => (statuses[r.id] = 'confirmed')}>
						<Icon name="check" size={18} /> Confirm
					</button>
				{/if}
				{/if}
			</RequestCard>
		{/each}
	</div>
{:else if tab === 'calendar'}
	<div id="panel-calendar" role="tabpanel" aria-labelledby="tab-calendar" tabindex="0" class="panel">
		<p class="muted hint">The next seven days on the owner's Google Calendar. Dashed visits are still waiting to be confirmed.</p>
		<ol class="week">
			{#each week as d, i (d.day)}
				<li class="day" class:empty={!d.events.length}>
					<h2>{dayLabel(d.day, i)}</h2>
					{#each d.events as e (e.id)}
						<details class="event" class:tentative={e.status === 'tentative'} data-status={e.status}>
							<summary>
								<span class="hours">{hours[e.window]}</span>
								<span class="what">
									<strong>{e.summary}</strong>
									{#if e.location}<small>{e.location}</small>{/if}
								</span>
								<span class="tag">{e.status}</span>
							</summary>
							<pre>{timeWindowLabels[e.window]}
{e.description}</pre>
						</details>
					{:else}
						<p class="muted free">Free</p>
					{/each}
				</li>
			{/each}
		</ol>
	</div>
{:else}
	<div id="panel-inbox" role="tabpanel" aria-labelledby="tab-inbox" tabindex="0" class="panel">
		<p class="muted hint">What reaches the owner's inbox. Replying goes straight to the customer.</p>
		{#each data.inbox as m, i (m.subject + m.at)}
			<details class="mail" open={i === 0}>
				<summary>
					<span class="from">{m.from}</span>
					<span class="subject">{m.subject}</span>
					<span class="at">{when(m.at)}</span>
				</summary>
				<p class="head">To: {m.to}{m.replyTo ? ` · Reply-To: ${m.replyTo}` : ''}</p>
				<pre>{m.text}</pre>
			</details>
		{/each}

		<h2 class="copy"><Icon name="user" size={20} /> And the customer's copy</h2>
		<details class="mail">
			<summary>
				<span class="from">LessPane</span>
				<span class="subject">{data.customer.subject}</span>
				<span class="at">{when(data.customer.at)}</span>
			</summary>
			<p class="head">To: {data.customer.to}</p>
			<pre>{data.customer.text}</pre>
		</details>
	</div>
{/if}

<p class="links">
	<a href="/">Try the customer's side <Icon name="right" size={18} /></a>
	<a href="/built">How it's built <Icon name="right" size={18} /></a>
</p>

<style>
	.intro h1 {
		margin: 0 0 6px;
		font-size: clamp(1.8rem, 7vw, 2.3rem);
		line-height: 1.05;
	}

	.intro p {
		margin: 0 0 12px;
		color: var(--ink-soft);
	}

	.note {
		display: flex;
		gap: 8px;
		padding: 10px 12px;
		border: 1.5px dashed var(--accent);
		border-radius: var(--sketchy);
		font-size: 0.9rem;
	}

	.note :global(svg) {
		flex: none;
		margin-top: 2px;
		color: var(--accent);
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin: 16px 0;
	}

	.stats div {
		padding: 8px 10px;
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--paper);
		box-shadow: var(--shadow);
		text-align: center;
	}

	.stats dt {
		font-size: 0.8rem;
		color: var(--ink-soft);
	}

	.stats dd {
		margin: 0;
		font-family: var(--hand);
		font-size: 1.6rem;
		line-height: 1.1;
		color: var(--brand);
	}

	.tabs {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
		margin-bottom: 12px;
	}

	.tabs button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 46px;
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--paper);
		color: var(--ink);
		font-family: var(--hand);
		font-size: 1.15rem;
		cursor: pointer;
	}

	.tabs button.on {
		background: var(--brand-soft);
		border-color: var(--brand);
		color: var(--brand);
	}

	.tabs button:focus-visible {
		outline: 3px solid var(--accent);
		outline-offset: 2px;
	}

	.count {
		display: inline-grid;
		place-items: center;
		min-width: 22px;
		height: 22px;
		padding: 0 6px;
		border-radius: 999px;
		background: var(--coral);
		color: #fff;
		font-family: system-ui, sans-serif;
		font-size: 0.78rem;
		font-weight: 700;
	}

	.hint {
		margin: 0 0 10px;
		font-size: 0.9rem;
	}

	.confirm {
		min-height: 44px;
		padding: 0 14px;
		font-size: 1.1rem;
	}

	.week {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 10px;
	}

	.day h2 {
		margin: 0 0 4px;
		font-size: 1.25rem;
	}

	.day.empty h2 {
		color: var(--ink-soft);
	}

	.free {
		margin: 0;
		font-size: 0.85rem;
	}

	.event {
		margin-bottom: 6px;
		border: 2px solid var(--lake);
		border-left-width: 6px;
		border-radius: 10px;
		background: var(--glass);
	}

	.event.tentative {
		border-style: dashed;
		border-left-style: solid;
		background: var(--paper);
	}

	.event summary,
	.mail summary {
		display: grid;
		align-items: center;
		gap: 8px;
		padding: 8px 10px;
		cursor: pointer;
		list-style: none;
	}

	.event summary::-webkit-details-marker,
	.mail summary::-webkit-details-marker {
		display: none;
	}

	.event summary {
		grid-template-columns: auto 1fr auto;
	}

	.hours {
		font-family: var(--hand);
		font-size: 1.1rem;
		color: var(--lake);
	}

	.what {
		display: grid;
		line-height: 1.25;
	}

	.what strong {
		font-weight: 600;
		font-size: 0.95rem;
	}

	.what small,
	.at,
	.head {
		font-size: 0.8rem;
		color: var(--ink-soft);
	}

	.tag {
		font-size: 0.72rem;
		font-weight: 650;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--ink-soft);
	}

	pre {
		margin: 0;
		padding: 0 12px 12px;
		font-family: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 0.8rem;
		line-height: 1.5;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.mail {
		margin-bottom: 8px;
		border: 1.5px solid var(--ink);
		border-radius: 10px;
		background: var(--paper);
	}

	.mail summary {
		grid-template-columns: 1fr auto;
		grid-template-areas: 'from at' 'subject subject';
		gap: 2px 8px;
	}

	.from {
		grid-area: from;
		font-weight: 650;
	}

	.subject {
		grid-area: subject;
		font-size: 0.95rem;
	}

	.at {
		grid-area: at;
	}

	.head {
		margin: 0;
		padding: 0 12px 6px;
		border-top: 1px dashed var(--line);
		padding-top: 6px;
	}

	.copy {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 20px 0 8px;
		font-size: 1.35rem;
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 10px 24px;
		margin: 24px 0 0;
		font-family: var(--hand);
		font-size: 1.25rem;
	}

	.links a {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
</style>
