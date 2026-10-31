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
	const walls = ['#f7df8f', '#bfe3b4', '#a9d8ea', '#f9c3b0', '#dcc8f0', '#f6b26b', '#8fd0cf', '#f5a9bf'];

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
	/** Front and back are long walls, the ends shorter, the walls of a wing shorter still. */
	const wallW = $derived(mode !== 'wall' ? 280 : side < 2 ? 280 : side < 4 ? 200 : 160);
	const bx = $derived((W - wallW) / 2);
	const top = $derived(GROUND - layout.floors * FLOOR_H);
	const roofPeak = $derived(mode === 'wall' && side >= 2 && side < 4 ? top - 70 : top - 50);
	const floorsToDraw = $derived(Array.from({ length: layout.floors }, (_, f) => f));
	/** The floors step shows three windows a floor; walls show their chosen bucket. */
	const bucketsFor = (f: number) => (mode === 'floors' ? 3 : BUCKETS[layout.windows[side][f]].count);

	// ---------- Plan view (sides mode) ----------
	// Looking down on the house. Up to four sides it's a rectangle with the chosen walls in color; past four
	// the footprint itself changes so it has that many walls: a cut corner (5), an L (6), an L with an angled
	// corner (7), a T (8). Each edge is [side index, from, to]: 0 front, 1 back, 2 left, 3 right, 4+ extra walls.
	type Pt = [number, number];
	type Footprint = { points: Pt[]; edges: [number, Pt, Pt][] };
	const footprints: Record<number, Footprint> = {
		4: {
			points: [[120, 205], [280, 205], [280, 75], [120, 75]],
			edges: [[0, [120, 205], [280, 205]], [3, [280, 205], [280, 75]], [1, [280, 75], [120, 75]], [2, [120, 75], [120, 205]]]
		},
		5: {
			points: [[120, 205], [280, 205], [280, 120], [235, 75], [120, 75]],
			edges: [[0, [120, 205], [280, 205]], [3, [280, 205], [280, 120]], [4, [280, 120], [235, 75]], [1, [235, 75], [120, 75]], [2, [120, 75], [120, 205]]]
		},
		6: {
			points: [[100, 210], [300, 210], [300, 145], [235, 145], [235, 75], [100, 75]],
			edges: [[0, [100, 210], [300, 210]], [3, [300, 210], [300, 145]], [4, [300, 145], [235, 145]], [5, [235, 145], [235, 75]], [1, [235, 75], [100, 75]], [2, [100, 75], [100, 210]]]
		},
		7: {
			points: [[100, 210], [300, 210], [300, 172], [276, 145], [235, 145], [235, 75], [100, 75]],
			edges: [[0, [100, 210], [300, 210]], [3, [300, 210], [300, 172]], [4, [300, 172], [276, 145]], [5, [276, 145], [235, 145]], [6, [235, 145], [235, 75]], [1, [235, 75], [100, 75]], [2, [100, 75], [100, 210]]]
		},
		8: {
			points: [[90, 210], [310, 210], [310, 140], [240, 140], [240, 70], [160, 70], [160, 140], [90, 140]],
			edges: [[0, [90, 210], [310, 210]], [3, [310, 210], [310, 140]], [4, [310, 140], [240, 140]], [5, [240, 140], [240, 70]], [1, [240, 70], [160, 70]], [6, [160, 70], [160, 140]], [7, [160, 140], [90, 140]], [2, [90, 140], [90, 210]]]
		}
	};
	const foot = $derived(footprints[Math.max(4, layout.sides)]);
	/**
	 * Where an edge's label goes: its midpoint, pushed outward. The footprints run counterclockwise on screen,
	 * so for an edge a→b the outward direction is (-dy, dx). That also works for the inner corners of an L or T.
	 */
	function labelAt(a: Pt, b: Pt): Pt {
		const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
		const len = Math.hypot(dx, dy) || 1;
		const [nx, ny] = [-dy / len, dx / len];
		return [(a[0] + b[0]) / 2 + nx * 22, (a[1] + b[1]) / 2 + ny * 18 + 6];
	}
	const shortName = (i: number) => (i < 4 ? SIDE_NAMES[i].split(' ')[0] : String(i + 1));
</script>

<svg viewBox="0 0 {W} {H}" role="img" aria-hidden="true">
	<rect width={W} height={H} fill="var(--paper)" />
	{#if mode === 'sides'}
		<!-- Looking down on the house: chosen walls in color, the rest dashed -->
		<polygon points={foot.points.map((p) => p.join(',')).join(' ')} fill="#f3e3c4" filter="url(#wash)" />
		{#each foot.edges as [i, a, b] (i)}
			{@const on = i < layout.sides}
			{@const [lx, ly] = labelAt(a, b)}
			<!-- No pencil filter here: a filter on a single straight line has a zero-height box and draws nothing -->
			<path
				d="M{a[0]} {a[1]} L{b[0]} {b[1]}"
				fill="none"
				stroke-linecap="round"
				stroke={on ? 'var(--lake)' : 'var(--line)'}
				stroke-width={on ? 9 : 3}
				stroke-dasharray={on ? undefined : '6 8'}
			/>
			<text x={lx} y={ly} text-anchor="middle" class="side-label" class:on>{shortName(i)}</text>
		{/each}
		<g filter="url(#pencil)" fill="none" stroke="var(--ink)" stroke-width="1.6">
			<polygon points={foot.points.map((p) => p.join(',')).join(' ')} />
			<!-- The front door, so "front" is obvious -->
			<path d="M{W / 2 - 10} {foot.edges[0][1][1]} v10 h20 v-10" />
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
