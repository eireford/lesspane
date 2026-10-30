<script lang="ts">
	import { enhance } from '$app/forms';
	import { timeWindowLabels, type TimeWindow } from '$lib/config';
	import { formatUsd } from '$lib/pricing';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let submitting = $state(false);

	const errors = $derived((form && 'errors' in form ? form.errors : {}) as Record<string, string>);
	const values = $derived(
		(form && 'values' in form ? form.values : {}) as Partial<Record<string, string>>
	);
	const windowEntries = Object.entries(timeWindowLabels) as [TimeWindow, string][];
</script>

<svelte:head>
	<title>Pick a time · LessPane</title>
</svelte:head>

<p class="step">Step 3 of 3</p>
<h1>Pick a time</h1>
<p class="muted">
	{formatUsd(data.quote.total)} · {data.details.address} ·
	<a href="/quote/price?{data.query}">change</a>
</p>

<form
	method="POST"
	action="?{data.query}"
	class="card stack"
	novalidate
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update();
			submitting = false;
		};
	}}
>
	{#if form && 'message' in form}
		<p class="alert" role="alert">{form.message}</p>
	{/if}

	<!-- Carry the validated home details; the server re-validates and re-prices them. -->
	<input type="hidden" name="address" value={data.details.address} />
	<input type="hidden" name="zip" value={data.details.zip} />
	<input type="hidden" name="stories" value={data.details.stories} />
	<input type="hidden" name="windows" value={data.details.windows} />
	<input type="hidden" name="service" value={data.details.service} />
	{#each data.details.addons as addon}
		<input type="hidden" name="addons" value={addon} />
	{/each}

	<div class="honeypot" aria-hidden="true">
		<label for="company">Company</label>
		<input id="company" name="company" type="text" tabindex="-1" autocomplete="off" />
	</div>

	<div>
		<label for="preferredDate">Preferred day</label>
		<input
			id="preferredDate"
			name="preferredDate"
			type="date"
			min={data.dateRange.min}
			max={data.dateRange.max}
			required
			value={values.preferredDate ?? ''}
			aria-invalid={!!errors.preferredDate}
		/>
		{#if errors.preferredDate}<p class="error">{errors.preferredDate}</p>{/if}
	</div>

	<fieldset>
		<legend>Time of day</legend>
		<div class="choices">
			{#each windowEntries as [value, label]}
				<label class="choice">
					<input
						type="radio"
						name="preferredWindow"
						{value}
						checked={(values.preferredWindow ?? 'morning') === value}
					/>
					<span>{label}</span>
				</label>
			{/each}
		</div>
		{#if errors.preferredWindow}<p class="error">{errors.preferredWindow}</p>{/if}
	</fieldset>

	<div>
		<label for="name">Name</label>
		<input
			id="name"
			name="name"
			type="text"
			autocomplete="name"
			required
			value={values.name ?? ''}
			aria-invalid={!!errors.name}
		/>
		{#if errors.name}<p class="error">{errors.name}</p>{/if}
	</div>

	<div class="row">
		<div>
			<label for="phone">Mobile phone</label>
			<input
				id="phone"
				name="phone"
				type="tel"
				autocomplete="tel"
				required
				value={values.phone ?? ''}
				aria-invalid={!!errors.phone}
			/>
			{#if errors.phone}<p class="error">{errors.phone}</p>{/if}
		</div>
		<div>
			<label for="email">Email</label>
			<input
				id="email"
				name="email"
				type="email"
				autocomplete="email"
				required
				value={values.email ?? ''}
				aria-invalid={!!errors.email}
			/>
			{#if errors.email}<p class="error">{errors.email}</p>{/if}
		</div>
	</div>

	<div>
		<label for="notes">Notes <span class="hint">(optional: gate code, pets, parking)</span></label>
		<textarea id="notes" name="notes" maxlength="500" value={values.notes ?? ''}></textarea>
		{#if errors.notes}<p class="error">{errors.notes}</p>{/if}
	</div>

	<button class="btn block" type="submit" disabled={submitting}>
		{submitting ? 'Sending…' : 'Request booking'}
	</button>
	<p class="muted small">No payment now. We'll text you to confirm the exact time.</p>
</form>

<style>
	.small {
		font-size: 0.9rem;
		text-align: center;
	}

	@media (max-width: 420px) {
		.row {
			grid-template-columns: 1fr;
		}
	}
</style>
