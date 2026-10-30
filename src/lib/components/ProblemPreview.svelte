<script lang="ts">
	import type { AddOnKey } from '$lib/config';
	import type { HousePhoto } from '$lib/photos';

	// A close-up of one window from the chosen house, showing a single problem on otherwise clean glass.
	let { house, problem }: { house: HousePhoto; problem: AddOnKey | 'inside' } = $props();

	/** The biggest front window makes the clearest close-up. */
	const rect = $derived(house.windows.reduce((a, b) => (b[2] * b[3] > a[2] * a[3] ? b : a)));
	const box = $derived.by(() => {
		const [x, y, w, h] = rect;
		const m = Math.max(w, h) * 0.25;
		return `${x - m} ${y - m} ${w + 2 * m} ${h + 2 * m}`;
	});
</script>

<svg class="preview" viewBox={box} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
	<image href={house.src} width={house.width} height={house.height} />
	{#if rect}
		{@const [x, y, w, h] = rect}
		{#if problem === 'inside'}
			<ellipse cx={x + w * 0.32} cy={y + h * 0.62} rx={w * 0.3} ry={h * 0.16} fill="url(#smear)" />
			<ellipse cx={x + w * 0.66} cy={y + h * 0.4} rx={w * 0.2} ry={h * 0.12} fill="url(#smear)" />
		{:else if problem === 'hard_water'}
			<rect {x} {y} width={w} height={h} filter="url(#mineral)" />
		{:else if problem === 'screens'}
			<rect {x} y={y + h / 2} width={w} height={h / 2} fill="url(#mesh)" />
			<rect {x} y={y + h / 2} width={w} height={h / 2} fill="#6d6555" opacity="0.25" />
		{:else}
			<rect {x} y={y + h * 0.9} width={w} height={h * 0.1} fill="#4f4130" opacity="0.8" />
		{/if}
	{/if}
</svg>

<style>
	.preview {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
