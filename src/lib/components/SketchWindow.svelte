<svelte:options namespace="svg" />

<script lang="ts">
	import type { Rect } from '$lib/sketches';

	// One pencil-drawn window, placed inside a parent <svg>. `dirt` (0 clean … 1 grimy) fades the hatching;
	// each problem flag draws that problem on the glass. Patterns and filters come from <SketchDefs>.
	let {
		rect,
		dirt = 0,
		smudges = false,
		screens = false,
		tracks = false,
		spots = false,
		stroke = 1.5,
		faint = 1
	}: {
		rect: Rect;
		dirt?: number;
		smudges?: boolean;
		screens?: boolean;
		tracks?: boolean;
		spots?: boolean;
		stroke?: number;
		/** How strongly the problem marks show (the house card keeps them light so dirt stands out). */
		faint?: number;
	} = $props();

	const [x, y, w, h] = $derived(rect);
</script>

<g class="window">
	<rect {x} {y} width={w} height={h} fill="var(--glass)" />
	<g opacity={faint}>
	{#if smudges}
		<!-- A hand print smeared on the inside -->
		<path
			d="M{x + w * 0.22} {y + h * 0.7} q{w * 0.08} {-h * 0.18} {w * 0.18} {-h * 0.04} t{w * 0.14} {h * 0.06} q{-w * 0.1} {h * 0.12} {-w * 0.3} {-h * 0.02}"
			fill="none"
			stroke="#8a8478"
			stroke-width={stroke * 0.7}
			filter="url(#pencil2)"
		/>
	{/if}
	{#if spots}<rect {x} {y} width={w} height={h} fill="url(#spots)" />{/if}
	{#if screens}<rect {x} y={y + h / 2} width={w} height={h / 2} fill="url(#mesh)" />{/if}
	</g>
	<rect class="dirt" {x} {y} width={w} height={h} fill="url(#hatch)" opacity={dirt * 0.85} />
	<rect class="dirt" {x} {y} width={w} height={h} fill="#9c8462" opacity={dirt * 0.35} />
	{#if dirt === 0}
		<!-- A couple of shine strokes on clean glass -->
		<path
			d="M{x + w * 0.62} {y + h * 0.12} l{w * 0.22} {h * 0.16} M{x + w * 0.56} {y + h * 0.24} l{w * 0.14} {h * 0.1}"
			stroke="#ffffff"
			stroke-width={stroke * 1.4}
			stroke-linecap="round"
		/>
	{/if}
	<g fill="none" stroke="var(--ink)" stroke-width={stroke} stroke-linecap="round" filter="url(#pencil)">
		<rect {x} {y} width={w} height={h} />
		<path d="M{x} {y + h / 2} H{x + w} M{x + w / 2} {y} V{y + h}" stroke-width={stroke * 0.7} />
		<path d="M{x - 3} {y + h + 3} H{x + w + 3}" />
		{#if tracks}
			<!-- Grime scribbled along the sill and track -->
			<path
				opacity={faint}
				d="M{x + 2} {y + h - 2} {Array.from({ length: 8 }, (_, k) => `L${x + 2 + ((k + 1) * (w - 4)) / 8} ${y + h - (k % 2 ? 2 : 5)}`).join(' ')}"
				stroke-width={stroke * 0.8}
			/>
		{/if}
	</g>
</g>

<style>
	.dirt {
		transition: opacity 0.35s ease;
	}

	@media (prefers-reduced-motion: reduce) {
		.dirt {
			transition: none;
		}
	}
</style>
