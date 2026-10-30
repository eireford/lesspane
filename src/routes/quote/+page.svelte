<script lang="ts">
	import { pricing, serviceLabels, type AddOnKey, type ServiceType } from '$lib/config';
	import { formatUsd } from '$lib/pricing';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const addOnEntries = Object.entries(pricing.addOns) as [AddOnKey, { label: string; price: number }][];
	const serviceEntries = Object.entries(serviceLabels) as [ServiceType, string][];
</script>

<svelte:head>
	<title>Your home · LessPane</title>
</svelte:head>

<p class="step">Step 1 of 3</p>
<h1>Tell us about your home</h1>
<p class="muted">Your price appears on the next screen.</p>

<form method="GET" action="/quote/price" class="card stack" novalidate>
	<div>
		<label for="address">Street address</label>
		<input
			id="address"
			name="address"
			type="text"
			autocomplete="street-address"
			required
			value={data.raw.address}
			aria-invalid={!!data.errors.address}
		/>
		{#if data.errors.address}<p class="error">{data.errors.address}</p>{/if}
	</div>

	<div>
		<label for="zip">ZIP code</label>
		<input
			id="zip"
			name="zip"
			type="text"
			inputmode="numeric"
			autocomplete="postal-code"
			maxlength="5"
			pattern="[0-9]{5}"
			required
			value={data.raw.zip}
			aria-invalid={!!data.errors.zip}
		/>
		{#if data.errors.zip}<p class="error">{data.errors.zip}</p>{/if}
	</div>

	<fieldset>
		<legend>Stories</legend>
		<div class="choices">
			{#each ['1', '2', '3'] as s}
				<label class="choice">
					<input type="radio" name="stories" value={s} checked={data.raw.stories === s} required />
					<span>{s}{s === '3' ? '+' : ''}</span>
				</label>
			{/each}
		</div>
		{#if data.errors.stories}<p class="error">{data.errors.stories}</p>{/if}
	</fieldset>

	<div>
		<label for="windows">
			About how many windows?
			<span class="hint">Count each pane you can see from outside; a guess is fine.</span>
		</label>
		<input
			id="windows"
			name="windows"
			type="number"
			inputmode="numeric"
			min="1"
			max={pricing.maxWindows}
			required
			value={data.raw.windows}
			aria-invalid={!!data.errors.windows}
		/>
		{#if data.errors.windows}<p class="error">{data.errors.windows}</p>{/if}
	</div>

	<fieldset>
		<legend>Service</legend>
		<div class="choices">
			{#each serviceEntries as [value, label]}
				<label class="choice">
					<input
						type="radio"
						name="service"
						{value}
						checked={(data.raw.service || 'exterior') === value}
					/>
					<span>{label}</span>
				</label>
			{/each}
		</div>
		{#if data.errors.service}<p class="error">{data.errors.service}</p>{/if}
	</fieldset>

	<fieldset>
		<legend>Add-ons <span class="hint">(optional)</span></legend>
		<div class="choices wrap-rows">
			{#each addOnEntries as [value, addOn]}
				<label class="choice">
					<input type="checkbox" name="addons" {value} checked={data.raw.addons.includes(value)} />
					<span>{addOn.label} <span class="hint">+{formatUsd(addOn.price)}</span></span>
				</label>
			{/each}
		</div>
		{#if data.errors.addons}<p class="error">{data.errors.addons}</p>{/if}
	</fieldset>

	<button class="btn block" type="submit">See my price</button>
</form>
