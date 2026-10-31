<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { TimeWindow } from '$lib/config';
	import { addDaysIso } from '$lib/validation';

	// When: a strip of days to swipe through, and a sun you drag across the sky.
	// Left of noon is the morning visit, right of noon the afternoon one.
	let {
		min,
		max,
		date = $bindable(),
		time = $bindable()
	}: { min: string; max: string; date: string; time: TimeWindow } = $props();

	const days = $derived.by(() => {
		const out: string[] = [];
		for (let d = min; d <= max && out.length < 21; d = addDaysIso(d, 1)) out.push(d);
		return out;
	});
	const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
		new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', opts);

	// ---------- Sun ----------
	const W = 300;
	const H = 150;
	const R = 120;
	const CX = W / 2;
	const CY = H - 10;
	/** Angle in degrees: 180 is sunrise (left), 0 is sunset (right). */
	let angle = $state(135);
	let dragging = $state(false);
	let sky = $state<SVGSVGElement>();

	$effect(() => {
		if (!dragging) angle = time === 'morning' ? 135 : 45;
	});

	const sun = $derived({
		x: CX + R * Math.cos((angle * Math.PI) / 180),
		y: CY - R * Math.sin((angle * Math.PI) / 180)
	});

	function aim(e: PointerEvent) {
		if (!sky) return;
		const r = sky.getBoundingClientRect();
		const x = ((e.clientX - r.left) / r.width) * W - CX;
		const y = CY - ((e.clientY - r.top) / r.height) * H;
		angle = Math.min(170, Math.max(10, (Math.atan2(Math.max(y, 0), x) * 180) / Math.PI));
		time = angle > 90 ? 'morning' : 'afternoon';
	}

	function onDown(e: PointerEvent) {
		// Stop the browser starting a text selection, which would cancel the drag.
		e.preventDefault();
		dragging = true;
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
		aim(e);
	}

	function onUp() {
		dragging = false;
		angle = time === 'morning' ? 135 : 45;
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowLeft') time = 'morning';
		else if (e.key === 'ArrowRight') time = 'afternoon';
		else return;
		e.preventDefault();
	}
</script>

<div class="when">
	<div class="days" role="radiogroup" aria-label="Day">
		{#each days as d (d)}
			<button
				type="button"
				class="day"
				class:on={d === date}
				class:sun={fmt(d, { weekday: 'short' }) === 'Sun'}
				role="radio"
				aria-checked={d === date}
				aria-label={fmt(d, { weekday: 'long', month: 'long', day: 'numeric' })}
				onclick={() => (date = d)}
			>
				<small>{fmt(d, { weekday: 'narrow' })}</small>
				<strong>{fmt(d, { day: 'numeric' })}</strong>
				<small>{fmt(d, { month: 'short' })}</small>
			</button>
		{/each}
	</div>

	<svg
		bind:this={sky}
		class="sky"
		class:pm={time === 'afternoon'}
		viewBox="0 0 {W} {H}"
		role="slider"
		tabindex="0"
		aria-label="Time of day"
		aria-valuemin={0}
		aria-valuemax={1}
		aria-valuenow={time === 'morning' ? 0 : 1}
		aria-valuetext={time === 'morning' ? 'Morning, 8am to noon' : 'Afternoon, noon to 5pm'}
		onpointerdown={onDown}
		onpointermove={(e) => dragging && aim(e)}
		onpointerup={onUp}
		onpointercancel={onUp}
		onkeydown={onKey}
	>
		<rect width={W} height={H} fill="var(--paper)" />
		<g filter="url(#wash)">
			<rect width={W} height={CY} fill="var(--sky-wash)" />
			<!-- Afternoon: the sky warms to peach -->
			<rect class="pm-wash" width={W} height={CY} fill="#fcd2a8" />
			<rect y={CY} width={W} height={H - CY} fill="var(--grass)" opacity="0.8" />
		</g>
		<g fill="none" stroke="var(--ink)" stroke-linecap="round" filter="url(#pencil)">
			<path d="M{CX - R} {CY} A{R} {R} 0 0 1 {CX + R} {CY}" stroke-width="1.4" stroke-dasharray="5 7" />
			<line x1={CX} y1={CY - R - 6} x2={CX} y2={CY} stroke-width="1" opacity="0.6" />
			<path d="M6 {CY} H{W - 6}" stroke-width="1.8" />
			<!-- Grass tufts along the horizon -->
			{#each [20, 58, 104, 196, 242, 280] as gx}
				<path d="M{gx} {CY} l3 -7 M{gx + 4} {CY} l1 -9 M{gx + 8} {CY} l-2 -6" stroke-width="1.2" />
			{/each}
		</g>
		<text x="16" y={CY - 12} class="hours">8–12</text>
		<text x={W - 16} y={CY - 12} class="hours" text-anchor="end">12–5</text>
		<g class="sun" class:dragging style="transform: translate({sun.x}px, {sun.y}px)">
			<g fill="var(--sun)" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round" filter="url(#pencil)">
				<circle r="13" />
				{#each Array(8) as _, k}
					{@const a = (k * Math.PI) / 4}
					<line x1={Math.cos(a) * 18} y1={Math.sin(a) * 18} x2={Math.cos(a) * 25} y2={Math.sin(a) * 25} />
				{/each}
			</g>
		</g>
	</svg>
	<p class="legend" aria-hidden="true">
		<span class:on={time === 'morning'}><Icon name="sun" size={18} /></span>
		<span class:on={time === 'afternoon'}><Icon name="sunset" size={18} /></span>
	</p>
</div>

<style>
	.days {
		display: flex;
		gap: 6px;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		padding: 2px 2px 10px;
		scrollbar-width: none;
	}

	.days::-webkit-scrollbar {
		display: none;
	}

	.day {
		flex: none;
		display: grid;
		justify-items: center;
		width: 52px;
		padding: 6px 0;
		border: 1.5px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--paper);
		color: var(--ink);
		font-family: var(--hand);
		scroll-snap-align: start;
		cursor: pointer;
		line-height: 1.2;
	}

	.day small {
		font-size: 0.7rem;
		color: var(--ink-soft);
	}

	.day strong {
		font-size: 1.15rem;
	}

	.day.sun {
		opacity: 0.6;
	}

	.day.on {
		border-color: var(--ink);
		background: var(--brand);
		color: var(--brand-ink);
		opacity: 1;
	}

	.day.on small {
		color: var(--brand-soft);
	}

	.sky {
		display: block;
		width: 100%;
		height: auto;
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		cursor: grab;
		box-shadow: var(--shadow);
	}

	.sky:focus-visible {
		outline: 3px solid var(--accent);
		outline-offset: 3px;
	}

	.pm-wash {
		opacity: 0;
		transition: opacity 0.4s ease;
	}

	.pm .pm-wash {
		opacity: 1;
	}

	.sun {
		transition: transform 0.35s cubic-bezier(0.3, 1.4, 0.5, 1);
	}

	.sun.dragging {
		transition: none;
	}

	.hours {
		font-family: var(--hand);
		font-size: 17px;
		fill: var(--ink);
	}

	.legend {
		display: flex;
		justify-content: space-between;
		margin: 6px 4px 0;
		color: var(--line);
	}

	.legend .on {
		color: var(--brand);
	}

	@media (prefers-reduced-motion: reduce) {
		.sun,
		.pm-wash {
			transition: none;
		}
	}
</style>
