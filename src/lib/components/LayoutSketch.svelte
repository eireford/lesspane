<script lang="ts">
	import SketchWindow from '$lib/components/SketchWindow.svelte';
	import { BUCKETS, SIDE_NAMES, type Layout, type Rect } from '$lib/layout';

	// The drawing for each quote step, built from the layout so far (patterns and filters from <SketchDefs>):
	//   floors → the front of a house with that many floors
	//   sides  → a plan view with the chosen sides drawn in color
	//   wall   → one side of the house, floor by floor, windows drawn from the buckets; the floor being
	//            asked about is highlighted
	let {
		layout,
		mode,
		side = 0,
		floor = 0
	}: { layout: Layout; mode: 'floors' | 'sides' | 'wall'; side?: number; floor?: number } = $props();

	const W = 400;
	const H = 300;
	const GROUND = 268;
	const FLOOR_H = 58;
	const walls = ['#f7df8f', '#bfe3b4', '#a9d8ea', '#f9c3b0'];

	/** Up to this many windows are drawn per floor; more show as "+". */
	const MAX_DRAWN = 8;

	function rowOfWindows(count: number, x0: number, x1: number, y: number): Rect[] {
		const n = Math.min(count, MAX_DRAWN);
		if (!n) return [];
		const slot = (x1 - x0) / n;
		const w = Math.min(34, slot * 0.6);
		return Array.from({ length: n }, (_, i) => [x0 + slot * i + (slot - w) / 2, y + 12, w, FLOOR_H - 26]);
	}

	// ---------- House front (floors and wall modes) ----------
	const wallW = $derived(mode === 'wall' && side >= 2 ? 200 : 280);
	const bx = $derived((W - wallW) / 2);
	const top = $derived(GROUND - layout.floors * FLOOR_H);
	const roofPeak = $derived(mode === 'wall' && side >= 2 ? top - 70 : top - 50);
	const floorsToDraw = $derived(Array.from({ length: layout.floors }, (_, f) => f));
	/** The floors step shows three windows a floor; walls show their chosen bucket. */
	const bucketsFor = (f: number) => (mode === 'floors' ? 3 : BUCKETS[layout.windows[side][f]].count);

	// ---------- Plan view (sides mode) ----------
	const plan = { x: 120, y: 70, w: 160, h: 130 };
	const planSides = [
		{ d: `M${plan.x} ${plan.y + plan.h} H${plan.x + plan.w}`, lx: W / 2, ly: plan.y + plan.h + 26 },
		{ d: `M${plan.x} ${plan.y} H${plan.x + plan.w}`, lx: W / 2, ly: plan.y - 12 },
		{ d: `M${plan.x} ${plan.y} V${plan.y + plan.h}`, lx: plan.x - 50, ly: plan.y + plan.h / 2 + 5 },
		{ d: `M${plan.x + plan.w} ${plan.y} V${plan.y + plan.h}`, lx: plan.x + plan.w + 50, ly: plan.y + plan.h / 2 + 5 }
	];
</script>

<svg viewBox="0 0 {W} {H}" role="img" aria-hidden="true">
	<rect width={W} height={H} fill="var(--paper)" />
	{#if mode === 'sides'}
		<!-- Looking down on the house: chosen sides in color with little windows, the rest dashed -->
		<g filter="url(#wash)">
			<rect x={plan.x} y={plan.y} width={plan.w} height={plan.h} fill="#f3e3c4" />
			<path d="M{plan.x} {plan.y} L{plan.x + plan.w} {plan.y + plan.h} M{plan.x + plan.w} {plan.y} L{plan.x} {plan.y + plan.h}" stroke="#d9c39a" stroke-width="2" />
		</g>
		{#each planSides as p, i}
			{@const on = i < layout.sides}
			<!-- No pencil filter here: a filter on a single straight line has a zero-height box and draws nothing -->
			<path d={p.d} fill="none" stroke-linecap="round" stroke={on ? 'var(--lake)' : 'var(--line)'} stroke-width={on ? 9 : 3} stroke-dasharray={on ? undefined : '6 8'} />
			<text x={p.lx} y={p.ly} text-anchor="middle" class="side-label" class:on>{SIDE_NAMES[i].split(' ')[0]}</text>
		{/each}
		<g filter="url(#pencil)" fill="none" stroke="var(--ink)" stroke-width="1.6">
			<rect x={plan.x} y={plan.y} width={plan.w} height={plan.h} />
			<!-- The front door, so "front" is obvious -->
			<path d="M{W / 2 - 10} {plan.y + plan.h} v10 h20 v-10" />
		</g>
	{:else}
		<g filter="url(#wash)">
			<path d="M0 0 H{W} V170 Q{W * 0.5} 130 0 176 Z" fill="var(--sky-wash)" opacity="0.8" />
			<path d="M0 {GROUND - 2} Q120 {GROUND - 10} 200 {GROUND - 4} T{W} {GROUND - 6} V{H} H0 Z" fill="var(--grass)" opacity="0.75" />
			<rect x={bx} y={top} width={wallW} height={layout.floors * FLOOR_H} fill={walls[mode === 'wall' ? side : 0]} opacity="0.9" />
			<path d="M{bx - 12} {top} L{W / 2} {roofPeak} L{bx + wallW + 12} {top} Z" fill="#d9604c" opacity="0.85" />
			{#if mode === 'wall'}
				<!-- The floor this step asks about -->
				<rect x={bx - 6} y={GROUND - (floor + 1) * FLOOR_H + 2} width={wallW + 12} height={FLOOR_H - 4} fill="var(--highlight)" opacity="0.9" />
			{/if}
		</g>
		<path d="M{bx - 12} {top} L{W / 2} {roofPeak} L{bx + wallW + 12} {top} Z" fill="url(#shade)" opacity="0.6" />
		<g fill="none" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" filter="url(#pencil)">
			<path d="M16 {GROUND} H{W - 16}" />
			<rect x={bx} y={top} width={wallW} height={layout.floors * FLOOR_H} />
			<path d="M{bx - 12} {top} L{W / 2} {roofPeak} L{bx + wallW + 12} {top} Z" />
			{#each floorsToDraw.slice(1) as f}
				<path d="M{bx} {GROUND - f * FLOOR_H} H{bx + wallW}" stroke-width="0.8" opacity="0.5" />
			{/each}
		</g>
		{#each floorsToDraw as f}
			{@const count = bucketsFor(f)}
			{@const y = GROUND - (f + 1) * FLOOR_H}
			{#each rowOfWindows(count, bx + 10, bx + wallW - 10, y) as rect, i (`${f}-${i}`)}
				<SketchWindow {rect} />
			{/each}
			{#if count > MAX_DRAWN}
				<text x={bx + wallW + 22} y={y + FLOOR_H / 2 + 6} class="more">+</text>
			{/if}
			{#if mode === 'wall' && count === 0}
				<text x={W / 2} y={y + FLOOR_H / 2 + 6} text-anchor="middle" class="none">no windows</text>
			{/if}
		{/each}
		{#if mode === 'wall'}
			<text x={W / 2} y={H - 8} text-anchor="middle" class="side-label on">{SIDE_NAMES[side]}</text>
		{/if}
	{/if}
</svg>

<style>
	svg {
		display: block;
		width: 100%;
		aspect-ratio: 4 / 3;
	}

	.side-label {
		font-family: var(--hand);
		font-size: 18px;
		fill: var(--line);
	}

	.side-label.on {
		fill: var(--ink);
	}

	.more {
		font-family: var(--hand);
		font-size: 28px;
		fill: var(--ink);
	}

	.none {
		font-family: var(--hand);
		font-size: 17px;
		fill: var(--ink-soft);
	}
</style>
