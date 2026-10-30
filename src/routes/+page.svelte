<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import HouseScene from '$lib/components/HouseScene.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import { pricing, type AddOnKey, type TimeWindow } from '$lib/config';
	import { houses } from '$lib/photos';
	import { computeQuote, formatUsd } from '$lib/pricing';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	/** Back-and-side tiles the scene will draw; bigger homes add a note and get sized up on site. */
	const MAX_EXTRA = 40;

	let pick = $state(0);
	let extra = $state(6);
	let dirt = $state<number[]>(Array(houses[0].windows.length + 6).fill(1));
	let inside = $state(false);
	let addons = $state<AddOnKey[]>([]);
	let booking = $state(false);
	let showLimits = $state(false);
	let submitting = $state(false);
	let bookingEl = $state<HTMLElement>();
	let stripEl = $state<HTMLElement>();
	let resultEl = $state<HTMLElement>();
	let resultInView = $state(false);

	const house = $derived(houses[pick]);
	const wiped = $derived(dirt.filter((d) => d === 0).length);
	const service = $derived(inside ? 'interior_exterior' : 'exterior');
	const quoteFor = (o: { inside?: boolean; addons?: AddOnKey[] } = {}) =>
		computeQuote({
			windows: wiped,
			stories: house.stories,
			service: (o.inside ?? inside) ? 'interior_exterior' : 'exterior',
			addons: o.addons ?? addons
		});
	const quote = $derived(wiped > 0 ? quoteFor() : null);

	/** What switching one problem on adds to the bill right now, before rounding. */
	const deltaInside = $derived(quoteFor({ inside: true }).subtotal - quoteFor({ inside: false }).subtotal);
	const deltaAddOn = (key: AddOnKey) =>
		quoteFor({ addons: [...new Set([...addons, key])] }).subtotal -
		quoteFor({ addons: addons.filter((a) => a !== key) }).subtotal;

	const addOnIcons: Record<AddOnKey, IconName> = { screens: 'mesh', tracks: 'track', hard_water: 'drop' };
	const addOnKeys = Object.keys(addOnIcons) as AddOnKey[];

	async function choose(i: number) {
		pick = (i + houses.length) % houses.length;
		// A new photo has different windows; start it grimy.
		dirt = Array(houses[pick].windows.length + extra).fill(1);
		await tick();
		stripEl?.querySelector<HTMLElement>(`[data-pick="${pick}"]`)?.scrollIntoView({
			behavior: 'smooth',
			block: 'nearest',
			inline: 'center'
		});
	}

	function setExtra(n: number) {
		extra = Math.min(MAX_EXTRA, Math.max(0, n));
		const total = house.windows.length + extra;
		dirt = total > dirt.length ? [...dirt, ...Array(total - dirt.length).fill(1)] : dirt.slice(0, total);
	}

	function toggleAddOn(key: AddOnKey) {
		addons = addons.includes(key) ? addons.filter((a) => a !== key) : [...addons, key];
	}

	async function startBooking() {
		booking = true;
		await tick();
		bookingEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	const errors = $derived((form?.errors ?? {}) as Record<string, string>);
	const values = $derived((form?.values ?? {}) as Partial<Record<string, string>>);
	const times: { value: TimeWindow; icon: IconName; hours: string; label: string }[] = [
		{ value: 'morning', icon: 'sun', hours: '8–12', label: 'Morning, 8am to noon' },
		{ value: 'afternoon', icon: 'sunset', hours: '12–5', label: 'Afternoon, noon to 5pm' }
	];

	$effect(() => {
		// A failed submit re-renders the page; keep the booking form open so errors show.
		if (form) booking = true;
	});

	$effect(() => {
		// The floating price bar is only needed while the price card is off screen.
		if (!resultEl) return;
		const io = new IntersectionObserver(([e]) => (resultInView = e.isIntersecting), { threshold: 0.3 });
		io.observe(resultEl);
		return () => io.disconnect();
	});
</script>

<svelte:head>
	<title>LessPane · Wipe away the windows you don't want to clean</title>
</svelte:head>

<h1 class="headline">Wipe it. <span>We'll wash it.</span></h1>

<!-- House picker: the photos are the menu -->
<div class="strip" bind:this={stripEl} role="listbox" aria-label="Choose a house like yours">
	{#each houses as h, i (h.id)}
		<button
			type="button"
			class="thumb"
			class:on={i === pick}
			data-pick={i}
			role="option"
			aria-selected={i === pick}
			aria-label={`${h.name}, ${h.stories} ${h.stories === 1 ? 'story' : 'stories'}`}
			onclick={() => choose(i)}
		>
			<img src={h.src} alt="" loading="lazy" width="96" height="64" />
			<span class="floors" aria-hidden="true">
				{#each Array(h.stories) as _}<i></i>{/each}
			</span>
		</button>
	{/each}
</div>

<section class="stage">
	<HouseScene {house} bind:dirt {inside} {addons} onprev={() => choose(pick - 1)} onnext={() => choose(pick + 1)} />

	<div class="toolbar">
		<button type="button" class="round" aria-label="Wipe every window" title="Wipe every window" onclick={() => (dirt = dirt.map(() => 0))}>
			<Icon name="sparkle" />
		</button>
		<button
			type="button"
			class="round"
			aria-label="Make every window dirty again"
			title="Start over"
			disabled={wiped === 0}
			onclick={() => (dirt = dirt.map(() => 1))}
		>
			<Icon name="undo" />
		</button>
		<span class="score" aria-live="polite" aria-label={`${wiped} of ${dirt.length} windows for us`}>
			<Icon name="window" size={20} />
			<strong>{wiped}</strong><span class="muted">/{dirt.length}</span>
		</span>
		<div class="stepper" role="group" aria-label="Windows around the back and sides">
			<button type="button" aria-label="Fewer back and side windows" onclick={() => setExtra(extra - 1)}><Icon name="minus" size={18} /></button>
			<span class="stepper-mid"><Icon name="back" size={18} /><output>{extra}</output></span>
			<button type="button" aria-label="More back and side windows" onclick={() => setExtra(extra + 1)}><Icon name="plus" size={18} /></button>
		</div>
	</div>
</section>

<!-- Other problems: tap to make them go away too -->
<section class="problems" aria-label="Other problems we can fix">
	<button
		type="button"
		class="problem"
		class:on={inside}
		aria-pressed={inside}
		aria-label="Smudges on the inside: clean both sides"
		title="Smudges on the inside"
		onclick={() => (inside = !inside)}
	>
		<Icon name="hand" size={34} />
		<span class="cost">{wiped ? `+${formatUsd(deltaInside)}` : '×2'}</span>
		{#if inside}<span class="tick"><Icon name="check" size={14} /></span>{/if}
	</button>
	{#each addOnKeys as key (key)}
		{@const on = addons.includes(key)}
		<button
			type="button"
			class="problem"
			class:on
			aria-pressed={on}
			aria-label={pricing.addOns[key].label}
			title={pricing.addOns[key].label}
			onclick={() => toggleAddOn(key)}
		>
			<Icon name={addOnIcons[key]} size={34} />
			<span class="cost">{wiped ? `+${formatUsd(deltaAddOn(key))}` : `${formatUsd(pricing.addOns[key].price)}`}</span>
			{#if on}<span class="tick"><Icon name="check" size={14} /></span>{/if}
		</button>
	{/each}
</section>

<section class="result card" aria-live="polite" bind:this={resultEl}>
	{#if quote}
		<div class="total">
			<Icon name="sparkle" size={30} />
			<p class="price">{formatUsd(quote.total)}</p>
			<button
				type="button"
				class="info"
				aria-expanded={showLimits}
				aria-label="What this estimate covers"
				onclick={() => (showLimits = !showLimits)}><Icon name="info" /></button
			>
		</div>
		<ul class="lines">
			<li>
				<span class="ico"
					><Icon name="window" size={18} />{#if inside}<Icon name="hand" size={18} />{/if}
					{wiped}</span
				><span>{formatUsd(quote.lines[0].amount)}</span>
			</li>
			{#each [...new Set(addons)] as key, k (key)}
				<li>
					<span class="ico"><Icon name={addOnIcons[key]} size={18} /> {wiped}</span>
					<span>{formatUsd(quote.lines[k + 1].amount)}</span>
				</li>
			{/each}
			{#if quote.minimumApplied}
				<li class="muted"><span class="ico">min</span><span>{formatUsd(pricing.minimum)}</span></li>
			{/if}
		</ul>
		{#if showLimits}
			<!-- Placeholder terms: review before the pilot. -->
			<div class="limits">
				<p>
					An instant estimate. Your technician walks the job with you on arrival and gives a formal estimate
					before any work starts. It holds as long as the home matches what you showed us:
				</p>
				<ul>
					<li>The number of windows and the house type you picked.</li>
					<li>Standard-size residential windows, reachable by ladder up to three stories.</li>
					<li>Not included: skylights, storm windows, sunrooms, inside glass more than 10 feet up.</li>
					<li>Paint, sticker or construction residue is quoted separately.</li>
					<li>Hard-water removal covers normal spotting; etched glass needs restoration pricing.</li>
					<li>Screen cleaning doesn't include repairs or replacements.</li>
				</ul>
				<p>If anything differs, you'll see the new price before we start, and you can say no.</p>
			</div>
		{/if}
		{#if !booking}
			<button type="button" class="btn block" onclick={startBooking}>
				<Icon name="calendar" /> Book · {formatUsd(quote.total)}
			</button>
		{/if}
	{:else}
		<div class="empty" aria-label="Wipe a window to see your price">
			<Icon name="swipe" size={36} />
			<span class="price ghost">$—</span>
		</div>
	{/if}
</section>

{#if booking && quote}
	<section class="card" bind:this={bookingEl} id="book" aria-label="Where and when">
		<form
			method="POST"
			class="stack"
			novalidate
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update({ reset: false });
					submitting = false;
				};
			}}
		>
			{#if form?.message}
				<p class="alert" role="alert">{form.message}</p>
			{/if}

			<!-- What the house scene built. The server re-validates and re-prices it. -->
			<input type="hidden" name="stories" value={house.stories} />
			<input type="hidden" name="windows" value={wiped} />
			<input type="hidden" name="service" value={service} />
			{#each addons as addon}
				<input type="hidden" name="addons" value={addon} />
			{/each}

			<div class="honeypot" aria-hidden="true">
				<label for="company">Company</label>
				<input id="company" name="company" type="text" tabindex="-1" autocomplete="off" />
			</div>

			{#snippet field(id: string, icon: IconName, label: string, attrs: Record<string, unknown>)}
				<div>
					<label class="field" class:bad={!!errors[id]}>
						<Icon name={icon} size={20} />
						<span class="sr">{label}</span>
						<input {id} name={id} placeholder={label} value={values[id] ?? ''} aria-invalid={!!errors[id]} {...attrs} />
					</label>
					{#if errors[id]}<p class="error">{errors[id]}</p>{/if}
				</div>
			{/snippet}

			<div class="row addr">
				{@render field('address', 'pin', 'Street address', { type: 'text', autocomplete: 'street-address', required: true })}
				{@render field('zip', 'home', 'ZIP', { type: 'text', inputmode: 'numeric', autocomplete: 'postal-code', maxlength: 5, required: true })}
			</div>

			<div class="row">
				{@render field('preferredDate', 'calendar', 'Day', {
					type: 'date',
					min: data.dateRange.min,
					max: data.dateRange.max,
					required: true
				})}
				<div class="times" role="radiogroup" aria-label="Time of day">
					{#each times as t (t.value)}
						<label class="time" title={t.label}>
							<input
								type="radio"
								name="preferredWindow"
								value={t.value}
								checked={(values.preferredWindow || 'morning') === t.value}
								aria-label={t.label}
							/>
							<span><Icon name={t.icon} size={22} /><small>{t.hours}</small></span>
						</label>
					{/each}
				</div>
			</div>
			{#if errors.preferredWindow}<p class="error">{errors.preferredWindow}</p>{/if}

			{@render field('name', 'user', 'Name', { type: 'text', autocomplete: 'name', required: true })}
			<div class="row">
				{@render field('phone', 'phone', 'Mobile', { type: 'tel', autocomplete: 'tel', required: true })}
				{@render field('email', 'mail', 'Email', { type: 'email', autocomplete: 'email', required: true })}
			</div>
			<div>
				<label class="field area">
					<Icon name="note" size={20} />
					<span class="sr">Notes</span>
					<textarea id="notes" name="notes" maxlength="500" placeholder="Gate code, pets, parking…" value={values.notes ?? ''}
					></textarea>
				</label>
				{#if errors.notes}<p class="error">{errors.notes}</p>{/if}
			</div>

			<button class="btn block" type="submit" disabled={submitting}>
				{#if submitting}…{:else}<Icon name="check" /> {formatUsd(quote.total)}{/if}
			</button>
			<p class="fine muted">No payment now · we text to confirm</p>
		</form>
	</section>
{/if}

{#if quote && !booking && !resultInView}
	<div class="dock">
		<span class="dock-price"><Icon name="sparkle" size={20} /> <strong>{formatUsd(quote.total)}</strong></span>
		<button type="button" class="btn" aria-label="Book this" onclick={startBooking}><Icon name="calendar" /></button>
	</div>
{/if}

<style>
	.headline {
		font-size: clamp(1.6rem, 7vw, 2.2rem);
		margin-bottom: 12px;
	}

	.headline span {
		color: var(--brand);
	}

	section + section {
		margin-top: 20px;
	}

	/* ---------- House picker ---------- */

	.strip {
		display: flex;
		gap: 8px;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		padding: 4px 2px 10px;
		margin: 0 -16px 10px;
		padding-left: 16px;
		padding-right: 16px;
		scrollbar-width: none;
	}

	.strip::-webkit-scrollbar {
		display: none;
	}

	.thumb {
		position: relative;
		flex: none;
		width: 84px;
		height: 58px;
		padding: 0;
		border: 2px solid transparent;
		border-radius: 10px;
		overflow: hidden;
		background: var(--line);
		scroll-snap-align: center;
		cursor: pointer;
		opacity: 0.75;
		transition:
			transform 0.15s ease,
			opacity 0.15s ease;
	}

	.thumb img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.thumb.on {
		border-color: var(--brand);
		opacity: 1;
		transform: translateY(-2px);
		box-shadow: var(--shadow);
	}

	.thumb:focus-visible {
		outline: 3px solid var(--accent);
	}

	.floors {
		position: absolute;
		right: 4px;
		bottom: 4px;
		display: flex;
		flex-direction: column-reverse;
		gap: 2px;
	}

	.floors i {
		display: block;
		width: 10px;
		height: 4px;
		border-radius: 1px;
		background: #fbfaf7;
		box-shadow: 0 0 2px rgb(0 0 0 / 0.5);
	}

	/* ---------- Toolbar ---------- */

	.toolbar {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 12px;
	}

	.round {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border: 1.5px solid var(--line);
		border-radius: 50%;
		background: var(--paper);
		color: var(--brand);
		cursor: pointer;
	}

	.round:disabled {
		color: var(--line);
		cursor: default;
	}

	.score {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		margin-right: auto;
		padding-left: 6px;
		color: var(--ink);
		font-size: 1.1rem;
	}

	.stepper {
		display: inline-flex;
		align-items: center;
		border: 1.5px solid var(--line);
		border-radius: 999px;
		background: var(--paper);
	}

	.stepper button {
		display: grid;
		place-items: center;
		width: 40px;
		height: 42px;
		border: 0;
		background: transparent;
		color: var(--brand);
		cursor: pointer;
	}

	.stepper-mid {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		min-width: 46px;
		justify-content: center;
		color: var(--ink-soft);
		font-weight: 700;
	}

	.stepper-mid output {
		color: var(--ink);
	}

	/* ---------- Problems ---------- */

	.problems {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 10px;
	}

	.problem {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 6px;
		padding: 14px 4px 10px;
		font: inherit;
		color: var(--ink-soft);
		background: var(--paper);
		border: 1.5px solid var(--line);
		border-radius: 14px;
		cursor: pointer;
		transition:
			transform 0.1s ease,
			background 0.15s ease;
	}

	.problem:active {
		transform: scale(0.96);
	}

	.problem.on {
		color: var(--brand);
		border-color: var(--brand);
		background: var(--brand-soft);
	}

	.problem:focus-visible {
		outline: 3px solid color-mix(in srgb, var(--brand) 35%, transparent);
		outline-offset: 2px;
	}

	.cost {
		font-size: 0.85rem;
		font-weight: 650;
		color: var(--bark);
	}

	.tick {
		position: absolute;
		top: 6px;
		right: 6px;
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--brand);
		color: var(--brand-ink);
	}

	/* ---------- Result ---------- */

	.total {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--brand);
	}

	.total .price {
		margin: 0;
		color: var(--brand);
		margin-right: auto;
	}

	.info {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border: 0;
		border-radius: 50%;
		background: var(--sky);
		color: var(--ink-soft);
		cursor: pointer;
	}

	.result .lines {
		margin: 12px 0;
	}

	.ico {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--ink-soft);
	}

	.empty {
		display: flex;
		align-items: center;
		gap: 14px;
		color: var(--ink-soft);
	}

	.price.ghost {
		color: var(--line);
	}

	.limits {
		margin-bottom: 14px;
		font-size: 0.92rem;
		color: var(--ink-soft);
		background: var(--sky);
		border-radius: 10px;
		padding: 10px 14px;
	}

	.limits ul {
		padding-left: 1.1rem;
		margin: 6px 0;
	}

	/* ---------- Booking ---------- */

	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}

	.field {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0;
		padding-left: 12px;
		font-weight: 400;
		color: var(--ink-soft);
		background: var(--paper);
		border: 1.5px solid var(--line);
		border-radius: 10px;
	}

	.field.bad {
		border-color: var(--danger);
	}

	.field:focus-within {
		border-color: var(--brand);
		outline: 3px solid color-mix(in srgb, var(--brand) 25%, transparent);
	}

	.field input,
	.field textarea {
		border: 0;
		background: transparent;
		padding-left: 0;
		outline: none;
	}

	.field.area {
		align-items: flex-start;
		padding-top: 12px;
	}

	.field.area textarea {
		padding-top: 0;
		min-height: 64px;
	}

	.row.addr {
		grid-template-columns: 2fr 1fr;
	}

	.times {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.time {
		position: relative;
		margin: 0;
	}

	.time input {
		position: absolute;
		inset: 0;
		opacity: 0;
		margin: 0;
		cursor: pointer;
	}

	.time span {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 48px;
		border: 1.5px solid var(--line);
		border-radius: 10px;
		background: var(--paper);
		color: var(--ink-soft);
		font-weight: 600;
	}

	.time input:checked + span {
		border-color: var(--brand);
		background: var(--brand-soft);
		color: var(--brand);
	}

	.time input:focus-visible + span {
		outline: 3px solid color-mix(in srgb, var(--brand) 35%, transparent);
	}

	.fine {
		margin: 0;
		font-size: 0.85rem;
		text-align: center;
	}

	/* ---------- Dock ---------- */

	.dock {
		position: sticky;
		bottom: calc(12px + env(safe-area-inset-bottom));
		margin-top: 20px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 8px 8px 8px 18px;
		background: var(--paper);
		border: 1.5px solid var(--brand);
		border-radius: 999px;
		box-shadow: var(--shadow);
		font-size: 1.25rem;
	}

	.dock-price {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--brand);
	}

	.dock .btn {
		min-height: 44px;
		padding: 0 18px;
	}

	@media (max-width: 420px) {
		.row,
		.row.addr {
			grid-template-columns: 1fr;
		}
	}
</style>
