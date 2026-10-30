<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import GrimeDefs from '$lib/components/GrimeDefs.svelte';
	import HouseScene from '$lib/components/HouseScene.svelte';
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import ProblemPreview from '$lib/components/ProblemPreview.svelte';
	import SwipeCard, { type SwipeDir } from '$lib/components/SwipeCard.svelte';
	import { pricing, type AddOnKey, type TimeWindow } from '$lib/config';
	import { houses } from '$lib/photos';
	import { computeQuote, formatUsd } from '$lib/pricing';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// The quote is a run of card decks: pick a house, wipe its windows, swipe through the extra
	// problems, swipe the price up to book. Every swipe has a button twin for tapping.
	type Stage = 'house' | 'wipe' | 'extras' | 'price' | 'book';
	const stages: { id: Stage; icon: IconName; label: string }[] = [
		{ id: 'house', icon: 'home', label: 'House' },
		{ id: 'wipe', icon: 'window', label: 'Windows' },
		{ id: 'extras', icon: 'sparkle', label: 'Extras' },
		{ id: 'price', icon: 'check', label: 'Price' },
		{ id: 'book', icon: 'calendar', label: 'Book' }
	];

	/** Back-and-side tiles the scene will draw; bigger homes add a note and get sized up on site. */
	const MAX_EXTRA = 40;

	let stage = $state<Stage>('house');
	let reached = $state(0);
	let deckAt = $state(0);
	let pick = $state(0);
	let extra = $state(6);
	let dirt = $state<number[]>([]);
	let inside = $state(false);
	let addons = $state<AddOnKey[]>([]);
	let extrasAt = $state(0);
	let showLimits = $state(false);
	let submitting = $state(false);
	let topCard = $state<SwipeCard>();

	const house = $derived(houses[pick]);
	const wiped = $derived(dirt.filter((d) => d === 0).length);
	const service = $derived(inside ? 'interior_exterior' : 'exterior');
	const quoteFor = (o: { inside?: boolean; addons?: AddOnKey[] } = {}) =>
		computeQuote({
			windows: Math.max(1, wiped),
			stories: house.stories,
			service: (o.inside ?? inside) ? 'interior_exterior' : 'exterior',
			addons: o.addons ?? addons
		});
	const quote = $derived(quoteFor());

	type Problem = AddOnKey | 'inside';
	const problems: { key: Problem; icon: IconName; label: string }[] = [
		{ key: 'inside', icon: 'hand', label: 'Smudges on the inside' },
		{ key: 'screens', icon: 'mesh', label: pricing.addOns.screens.label },
		{ key: 'tracks', icon: 'track', label: pricing.addOns.tracks.label },
		{ key: 'hard_water', icon: 'drop', label: pricing.addOns.hard_water.label }
	];
	const addOnIcons: Record<AddOnKey, IconName> = { screens: 'mesh', tracks: 'track', hard_water: 'drop' };

	/** What fixing one problem adds to the bill right now, before rounding. */
	function delta(key: Problem) {
		if (key === 'inside') return quoteFor({ inside: true }).subtotal - quoteFor({ inside: false }).subtotal;
		return (
			quoteFor({ addons: [...new Set([...addons, key])] }).subtotal -
			quoteFor({ addons: addons.filter((a) => a !== key) }).subtotal
		);
	}

	function go(s: Stage) {
		stage = s;
		reached = Math.max(reached, stages.findIndex((x) => x.id === s));
		if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	// ---------- House deck ----------

	const deckHouse = (k: number) => houses[((k % houses.length) + houses.length) % houses.length];

	function onHouseSwipe(dir: SwipeDir) {
		if (dir === 'right') {
			pick = ((deckAt % houses.length) + houses.length) % houses.length;
			dirt = Array(houses[pick].windows.length + extra).fill(1);
			go('wipe');
		} else {
			deckAt += 1;
		}
	}

	function setExtra(n: number) {
		extra = Math.min(MAX_EXTRA, Math.max(0, n));
		const total = house.windows.length + extra;
		dirt = total > dirt.length ? [...dirt, ...Array(total - dirt.length).fill(1)] : dirt.slice(0, total);
	}

	// ---------- Extras deck ----------

	function onProblemSwipe(dir: SwipeDir) {
		const key = problems[extrasAt].key;
		const yes = dir === 'right';
		if (key === 'inside') inside = yes;
		else addons = yes ? [...new Set([...addons, key])] : addons.filter((a) => a !== key);
		extrasAt += 1;
		if (extrasAt >= problems.length) go('price');
	}

	function redoExtras() {
		extrasAt = 0;
		go('extras');
	}

	// ---------- Booking ----------

	const errors = $derived((form?.errors ?? {}) as Record<string, string>);
	const values = $derived((form?.values ?? {}) as Partial<Record<string, string>>);
	const times: { value: TimeWindow; icon: IconName; hours: string; label: string }[] = [
		{ value: 'morning', icon: 'sun', hours: '8–12', label: 'Morning, 8am to noon' },
		{ value: 'afternoon', icon: 'sunset', hours: '12–5', label: 'Afternoon, noon to 5pm' }
	];

	$effect(() => {
		// A failed submit re-renders the page; stay on the booking card so errors show.
		if (form) {
			stage = 'book';
			reached = stages.length - 1;
		}
	});

	async function flingTop(dir: SwipeDir) {
		await tick();
		topCard?.fling(dir);
	}
</script>

<svelte:head>
	<title>LessPane · Swipe to a sparkling house</title>
</svelte:head>

<GrimeDefs />

<!-- Where you are; tap a step you've reached to go back -->
<nav class="steps" aria-label="Steps">
	{#each stages as s, i (s.id)}
		<button
			type="button"
			class="step-dot"
			class:on={stage === s.id}
			class:done={i < reached || (i <= reached && stage !== s.id)}
			disabled={i > reached}
			aria-current={stage === s.id ? 'step' : undefined}
			aria-label={s.label}
			onclick={() => go(s.id)}
		>
			<Icon name={s.icon} size={18} />
		</button>
		{#if i < stages.length - 1}<span class="bar" class:lit={i < reached}></span>{/if}
	{/each}
</nav>

{#if stage === 'house'}
	<!-- ---------- 1. House deck: left = nope, right = that's mine ---------- -->
	<section class="deck-wrap" aria-label="Find a house like yours">
		<div class="deck">
			<div class="deck-card behind" aria-hidden="true">
				<img src={deckHouse(deckAt + 1).src} alt="" />
			</div>
			{#key deckAt}
				{@const h = deckHouse(deckAt)}
				<SwipeCard
					bind:this={topCard}
					dirs={['left', 'right']}
					onswipe={onHouseSwipe}
					label={`${h.name}. Swipe right if it looks like your house, left for the next one.`}
				>
					{#snippet children(lean: number)}
						<div class="deck-card" class:wiggle={deckAt === 0}>
							<img src={h.src} alt={h.name} draggable="false" />
							<div class="shade"></div>
							<span class="floors" aria-label={`${h.stories} ${h.stories === 1 ? 'story' : 'stories'}`}>
								{#each Array(h.stories) as _}<i></i>{/each}
							</span>
							<span class="stamp yes" style="opacity: {Math.max(0, lean)}"><Icon name="heart" size={56} /></span>
							<span class="stamp no" style="opacity: {Math.max(0, -lean)}"><Icon name="x" size={56} /></span>
						</div>
					{/snippet}
				</SwipeCard>
			{/key}
		</div>
		<div class="buttons">
			<button type="button" class="big no" aria-label="Not like my house" onclick={() => flingTop('left')}>
				<Icon name="x" size={30} />
			</button>
			<button type="button" class="small" aria-label="Previous house" onclick={() => (deckAt -= 1)}>
				<Icon name="undo" size={20} />
			</button>
			<button type="button" class="big yes" aria-label="That's my house" onclick={() => flingTop('right')}>
				<Icon name="heart" size={30} />
			</button>
		</div>
	</section>
{:else if stage === 'wipe'}
	<!-- ---------- 2. Wipe the windows you want gone ---------- -->
	<section aria-label="Wipe the windows you want us to clean">
		<HouseScene {house} bind:dirt {inside} {addons} />

		<div class="toolbar">
			<button type="button" class="round" aria-label="Wipe every window" onclick={() => (dirt = dirt.map(() => 0))}>
				<Icon name="sparkle" />
			</button>
			<button
				type="button"
				class="round"
				aria-label="Make every window dirty again"
				disabled={wiped === 0}
				onclick={() => (dirt = dirt.map(() => 1))}
			>
				<Icon name="undo" />
			</button>
			<span class="score" aria-live="polite" aria-label={`${wiped} of ${dirt.length} windows for us`}>
				<Icon name="window" size={20} /><strong>{wiped}</strong><span class="muted">/{dirt.length}</span>
			</span>
			<div class="stepper" role="group" aria-label="Windows around the back and sides">
				<button type="button" aria-label="Fewer back and side windows" onclick={() => setExtra(extra - 1)}
					><Icon name="minus" size={18} /></button
				>
				<span class="stepper-mid"><Icon name="back" size={18} /><output>{extra}</output></span>
				<button type="button" aria-label="More back and side windows" onclick={() => setExtra(extra + 1)}
					><Icon name="plus" size={18} /></button
				>
			</div>
		</div>

		<div class="nextbar">
			<button type="button" class="round" aria-label="Pick a different house" onclick={() => go('house')}>
				<Icon name="left" />
			</button>
			<span class="running" aria-live="polite">{wiped ? formatUsd(quote.total) : ''}</span>
			<button type="button" class="btn go" aria-label="Next: extras" disabled={wiped === 0} onclick={() => { extrasAt = 0; go('extras'); }}>
				<Icon name="right" />
			</button>
		</div>
	</section>
{:else if stage === 'extras'}
	<!-- ---------- 3. Problem deck: right = fix it, left = skip ---------- -->
	{@const p = problems[Math.min(extrasAt, problems.length - 1)]}
	<section class="deck-wrap" aria-label="Anything else bugging you?">
		<p class="count" aria-hidden="true">
			{#each problems as q, i (q.key)}<i class:on={i === extrasAt} class:done={i < extrasAt}></i>{/each}
		</p>
		<div class="deck">
			{#if extrasAt + 1 < problems.length}
				<div class="deck-card behind" aria-hidden="true">
					<ProblemPreview {house} problem={problems[extrasAt + 1].key} />
				</div>
			{/if}
			{#key extrasAt}
				<SwipeCard
					bind:this={topCard}
					dirs={['left', 'right']}
					onswipe={onProblemSwipe}
					label={`${p.label}, adds ${formatUsd(delta(p.key))}. Swipe right to fix it, left to skip.`}
				>
					{#snippet children(lean: number)}
						<div class="deck-card">
							<ProblemPreview {house} problem={p.key} />
							<div class="shade"></div>
							<span class="badge"><Icon name={p.icon} size={40} /></span>
							<span class="tag">+{formatUsd(delta(p.key))}</span>
							<span class="stamp yes" style="opacity: {Math.max(0, lean)}"><Icon name="sparkle" size={56} /></span>
							<span class="stamp no" style="opacity: {Math.max(0, -lean)}"><Icon name="x" size={56} /></span>
						</div>
					{/snippet}
				</SwipeCard>
			{/key}
		</div>
		<div class="buttons">
			<button type="button" class="big no" aria-label="Skip this one" onclick={() => flingTop('left')}>
				<Icon name="x" size={30} />
			</button>
			<button type="button" class="small" aria-label="Back to the windows" onclick={() => go('wipe')}>
				<Icon name="window" size={20} />
			</button>
			<button type="button" class="big yes" aria-label="Fix it" onclick={() => flingTop('right')}>
				<Icon name="sparkle" size={30} />
			</button>
		</div>
	</section>
{:else if stage === 'price'}
	<!-- ---------- 4. Price card: swipe up to book ---------- -->
	<section class="deck-wrap" aria-label="Your price">
		<div class="deck price-deck">
			<SwipeCard bind:this={topCard} dirs={['up']} onswipe={() => go('book')} label={`Your price, ${formatUsd(quote.total)}. Swipe up to book.`}>
				{#snippet children(_lean: number, rise: number)}
					<div class="deck-card price-card" style="--rise: {rise}">
						<img src={house.src} alt="" class="bg" draggable="false" />
						<div class="price-body">
							<p class="total"><Icon name="sparkle" size={30} />{formatUsd(quote.total)}</p>
							<ul class="lines">
								<li>
									<span class="ico"
										><Icon name="window" size={18} />{#if inside}<Icon name="hand" size={18} />{/if} {wiped}</span
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
							<button
								type="button"
								class="info"
								aria-expanded={showLimits}
								aria-label="What this estimate covers"
								onclick={() => (showLimits = !showLimits)}><Icon name="info" /></button
							>
							{#if showLimits}
								<!-- Placeholder terms: review before the pilot. -->
								<div class="limits">
									<p>
										An instant estimate. Your technician walks the job with you on arrival and gives a formal
										estimate before any work starts. It holds as long as the home matches what you showed us:
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
							<span class="swipe-up" aria-hidden="true"><Icon name="up" size={32} /></span>
						</div>
					</div>
				{/snippet}
			</SwipeCard>
		</div>
		<div class="buttons">
			<button type="button" class="small" aria-label="Change extras" onclick={redoExtras}><Icon name="undo" size={20} /></button>
			<button type="button" class="big yes" aria-label="Book it" onclick={() => flingTop('up')}><Icon name="calendar" size={30} /></button>
		</div>
	</section>
{:else}
	<!-- ---------- 5. Book ---------- -->
	<section class="card book" aria-label="Where and when">
		<p class="book-total"><Icon name="sparkle" size={22} /> {formatUsd(quote.total)}</p>
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

			<!-- What the decks built. The server re-validates and re-prices it. -->
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

			<div class="nextbar">
				<button type="button" class="round" aria-label="Back to the price" onclick={() => go('price')}>
					<Icon name="left" />
				</button>
				<button class="btn go wide" type="submit" disabled={submitting} aria-label={`Request my visit, ${formatUsd(quote.total)}`}>
					{#if submitting}…{:else}<Icon name="check" /> {formatUsd(quote.total)}{/if}
				</button>
			</div>
			<p class="fine muted">No payment now · we text to confirm</p>
		</form>
	</section>
{/if}

<style>
	/* ---------- Steps ---------- */

	.steps {
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 0 0 16px;
	}

	.step-dot {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		padding: 0;
		border: 1.5px solid var(--line);
		border-radius: 50%;
		background: var(--paper);
		color: var(--line);
		cursor: pointer;
	}

	.step-dot:disabled {
		cursor: default;
	}

	.step-dot.done {
		color: var(--brand);
		border-color: var(--brand);
	}

	.step-dot.on {
		color: var(--brand-ink);
		background: var(--brand);
		border-color: var(--brand);
		transform: scale(1.12);
	}

	.bar {
		flex: 1;
		max-width: 36px;
		height: 2px;
		background: var(--line);
	}

	.bar.lit {
		background: var(--brand);
	}

	/* ---------- Decks ---------- */

	.deck-wrap {
		display: grid;
		gap: 18px;
	}

	.deck {
		position: relative;
		width: 100%;
		max-width: 420px;
		margin: 0 auto;
		aspect-ratio: 4 / 5;
	}

	.deck :global(.swipe) {
		position: absolute;
		inset: 0;
	}

	.deck-card {
		position: relative;
		width: 100%;
		height: 100%;
		border-radius: 20px;
		overflow: hidden;
		background: var(--line);
		box-shadow:
			0 2px 4px rgb(42 43 38 / 0.08),
			0 16px 40px rgb(42 43 38 / 0.16);
	}

	.deck-card img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		pointer-events: none;
	}

	/* The first card sways once to show it can be swiped. */
	.wiggle {
		animation: wiggle 1.6s ease-in-out 0.6s 1;
	}

	@keyframes wiggle {
		0%,
		100% {
			transform: none;
		}
		25% {
			transform: translateX(-26px) rotate(-3deg);
		}
		60% {
			transform: translateX(26px) rotate(3deg);
		}
	}

	.deck-card.behind {
		position: absolute;
		inset: 0;
		transform: scale(0.94) translateY(14px);
		opacity: 0.7;
		filter: saturate(0.7);
	}

	.shade {
		position: absolute;
		inset: auto 0 0;
		height: 35%;
		background: linear-gradient(transparent, rgb(20 20 16 / 0.55));
		pointer-events: none;
	}

	.floors {
		position: absolute;
		left: 18px;
		bottom: 18px;
		display: flex;
		flex-direction: column-reverse;
		gap: 4px;
	}

	.floors i {
		display: block;
		width: 26px;
		height: 8px;
		border-radius: 2px;
		background: #fbfaf7;
	}

	.stamp {
		position: absolute;
		top: 22px;
		display: grid;
		place-items: center;
		width: 88px;
		height: 88px;
		border-radius: 50%;
		background: rgb(251 250 247 / 0.9);
		pointer-events: none;
	}

	.stamp.yes {
		left: 22px;
		color: var(--brand);
		transform: rotate(-12deg);
	}

	.stamp.no {
		right: 22px;
		color: var(--danger);
		transform: rotate(12deg);
	}

	.badge {
		position: absolute;
		left: 18px;
		bottom: 18px;
		display: grid;
		place-items: center;
		width: 68px;
		height: 68px;
		border-radius: 18px;
		background: rgb(251 250 247 / 0.92);
		color: var(--brand);
	}

	.tag {
		position: absolute;
		right: 18px;
		bottom: 26px;
		font-size: 1.8rem;
		font-weight: 750;
		color: #fbfaf7;
		text-shadow: 0 1px 6px rgb(0 0 0 / 0.4);
	}

	.count {
		display: flex;
		justify-content: center;
		gap: 6px;
		margin: 0;
	}

	.count i {
		width: 28px;
		height: 4px;
		border-radius: 2px;
		background: var(--line);
	}

	.count i.done,
	.count i.on {
		background: var(--brand);
	}

	.buttons {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 22px;
	}

	.big,
	.small {
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: var(--paper);
		box-shadow: var(--shadow);
		cursor: pointer;
		transition: transform 0.1s ease;
	}

	.big:active,
	.small:active {
		transform: scale(0.92);
	}

	.big {
		width: 68px;
		height: 68px;
		border: 2px solid currentColor;
	}

	.big.no {
		color: var(--danger);
	}

	.big.yes {
		color: var(--brand);
	}

	.small {
		width: 46px;
		height: 46px;
		border: 1.5px solid var(--line);
		color: var(--ink-soft);
	}

	/* ---------- Price card ---------- */

	.price-deck {
		aspect-ratio: 4 / 5.2;
	}

	.price-card .bg {
		position: absolute;
		inset: 0;
		filter: blur(3px) brightness(0.9);
		transform: scale(1.06);
	}

	.price-body {
		position: absolute;
		inset: auto 12px 12px;
		max-height: calc(100% - 24px);
		overflow: auto;
		padding: 18px 18px 46px;
		border-radius: 16px;
		background: rgb(251 250 247 / calc(0.94 + var(--rise) * 0.06));
		transform: translateY(calc(var(--rise) * -10px));
	}

	.total {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0 0 8px;
		font-size: 2.8rem;
		font-weight: 750;
		letter-spacing: -0.02em;
		color: var(--brand);
	}

	.ico {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--ink-soft);
	}

	.info {
		position: absolute;
		top: 16px;
		right: 16px;
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

	.limits {
		margin-top: 12px;
		font-size: 0.9rem;
		color: var(--ink-soft);
	}

	.limits ul {
		padding-left: 1.1rem;
		margin: 6px 0;
	}

	.swipe-up {
		position: absolute;
		left: 50%;
		bottom: 8px;
		color: var(--brand);
		transform: translateX(-50%);
		animation: nudge 1.4s ease-in-out infinite;
	}

	@keyframes nudge {
		0%,
		100% {
			transform: translate(-50%, 0);
			opacity: 0.6;
		}
		50% {
			transform: translate(-50%, -8px);
			opacity: 1;
		}
	}

	/* ---------- Wipe stage ---------- */

	.toolbar,
	.nextbar {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 12px;
	}

	.nextbar {
		margin-top: 18px;
	}

	.round {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
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
		height: 44px;
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

	.running {
		margin-left: auto;
		font-size: 1.4rem;
		font-weight: 750;
		color: var(--brand);
	}

	.btn.go {
		min-width: 64px;
		height: 56px;
		padding: 0 20px;
	}

	.btn.go.wide {
		flex: 1;
	}

	/* ---------- Booking ---------- */

	.book-total {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 14px;
		font-size: 1.6rem;
		font-weight: 750;
		color: var(--brand);
	}

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

	@media (prefers-reduced-motion: reduce) {
		.swipe-up,
		.wiggle {
			animation: none;
		}
	}

	@media (max-width: 420px) {
		.row,
		.row.addr {
			grid-template-columns: 1fr;
		}
	}
</style>
