<script lang="ts">
	import SketchWindow from '$lib/components/SketchWindow.svelte';
	import type { AddOnKey } from '$lib/config';
	import { SKETCH_H, SKETCH_W, type HouseSketch } from '$lib/sketches';

	// A watercolor-and-pencil sketch of the house. The first `clean` windows are wiped; the rest stay hatched with dirt,
	// so the squeegee's count shows on the house itself. Fixed problems vanish from clean windows.
	let {
		house,
		clean,
		inside,
		addons,
		lean = 0
	}: { house: HouseSketch; clean: number; inside: boolean; addons: AddOnKey[]; lean?: number } = $props();

	const has = (key: AddOnKey) => addons.includes(key);
	const [dx, dy, dw, dh] = $derived(house.door);
</script>

<div class="house">
	<svg viewBox="0 0 {SKETCH_W} {SKETCH_H}" role="img" aria-label={house.name}>
		<rect width={SKETCH_W} height={SKETCH_H} fill="var(--paper)" />
		<!-- Watercolor washes: sky, grass, walls, roof, door. Then shading and the pencil outline. -->
		<g filter="url(#wash)">
			<path d="M0 0 H{SKETCH_W} V190 Q{SKETCH_W * 0.5} 150 0 196 Z" fill="var(--sky-wash)" opacity="0.8" />
			<circle cx="350" cy="44" r="20" fill="var(--sun)" opacity="0.85" />
			<path d="M0 270 Q120 262 200 268 T{SKETCH_W} 266 V{SKETCH_H} H0 Z" fill="var(--grass)" opacity="0.75" />
			{#each house.walls as [d, color]}<path {d} fill={color} opacity="0.9" />{/each}
			{#each house.lines.filter((d) => d.trim().endsWith('Z')) as d}<path {d} fill={house.roof} opacity="0.85" />{/each}
			<rect x={dx} y={dy} width={dw} height={dh} fill={house.doorColor} opacity="0.9" />
		</g>
		{#each house.lines.filter((d) => d.trim().endsWith('Z')) as d}
			<path {d} fill="url(#shade)" opacity="0.6" />
		{/each}
		<g fill="none" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
			<g filter="url(#pencil)">
				{#each house.lines as d}<path {d} />{/each}
				<rect x={dx} y={dy} width={dw} height={dh} />
			</g>
			<g filter="url(#pencil2)" opacity="0.35" transform="translate(0.8 0.6)">
				{#each house.lines as d}<path {d} />{/each}
			</g>
			<circle cx={dx + dw - 6} cy={dy + dh / 2} r="1.6" />
		</g>
		{#each house.windows as rect, i (house.id + i)}
			{@const ok = i < clean}
			<SketchWindow
				{rect}
				dirt={ok ? 0 : 1}
				smudges={!(ok && inside)}
				screens={!(ok && has('screens'))}
				tracks={!(ok && has('tracks'))}
				spots={!(ok && has('hard_water'))}
				faint={0.3}
			/>
		{/each}
	</svg>
	<span class="floors" aria-hidden="true">{#each Array(house.stories) as _}<i></i>{/each}</span>
	<span class="side left" style="opacity: {Math.max(0, -lean)}" aria-hidden="true">›</span>
	<span class="side right" style="opacity: {Math.max(0, lean)}" aria-hidden="true">‹</span>
</div>

<style>
	.house {
		position: relative;
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		overflow: hidden;
		background: var(--paper);
		box-shadow: var(--shadow);
	}

	svg {
		display: block;
		width: 100%;
		aspect-ratio: 4 / 3;
		pointer-events: none;
	}

	.floors {
		position: absolute;
		left: 14px;
		bottom: 14px;
		display: flex;
		flex-direction: column-reverse;
		gap: 3px;
	}

	.floors i {
		display: block;
		width: 20px;
		height: 7px;
		border: 1.5px solid var(--ink);
		border-radius: 2px 4px 2px 3px;
	}

	.side {
		position: absolute;
		top: 50%;
		font-family: var(--hand);
		font-size: 3.2rem;
		line-height: 1;
		color: var(--ink);
		transform: translateY(-50%);
	}

	.side.left {
		left: 14px;
	}

	.side.right {
		right: 14px;
	}
</style>
