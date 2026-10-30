<script lang="ts">
	import type { AddOnKey } from '$lib/config';
	import { houseBox, licenseUrl, type HousePhoto } from '$lib/photos';

	// A house photo with its windows drawn grimy or clean. The first `clean` windows sparkle,
	// so the squeegee's count shows up on the house itself. Dirt effects come from <GrimeDefs>.
	let {
		house,
		clean,
		inside,
		addons,
		lean = 0
	}: { house: HousePhoto; clean: number; inside: boolean; addons: AddOnKey[]; lean?: number } = $props();

	const has = (key: AddOnKey) => addons.includes(key);
</script>

<div class="house">
	<svg viewBox={houseBox(house)} preserveAspectRatio="xMidYMid slice" role="img" aria-label={house.name}>
		<image href={house.src} width={house.width} height={house.height} />
		{#each house.windows as [x, y, w, h], i (house.id + i)}
			{@const ok = i < clean}
			{#if !(ok && inside)}
				<ellipse cx={x + w * 0.32} cy={y + h * 0.62} rx={w * 0.3} ry={h * 0.16} fill="url(#smear)" />
			{/if}
			{#if !(ok && has('hard_water'))}
				<rect {x} {y} width={w} height={h} filter="url(#mineral)" />
			{/if}
			{#if !(ok && has('screens'))}
				<rect {x} y={y + h / 2} width={w} height={h / 2} fill="url(#mesh)" />
			{/if}
			{#if !(ok && has('tracks'))}
				<rect {x} y={y + h * 0.93} width={w} height={h * 0.07} fill="#4f4130" opacity="0.7" />
			{/if}
			<rect class="grime" class:gone={ok} {x} {y} width={w} height={h} filter="url(#grime)" />
		{/each}
	</svg>
	<span class="floors" aria-hidden="true">{#each Array(house.stories) as _}<i></i>{/each}</span>
	<span class="side left" style="opacity: {Math.max(0, -lean)}" aria-hidden="true">›</span>
	<span class="side right" style="opacity: {Math.max(0, lean)}" aria-hidden="true">‹</span>
	<a class="credit" href={house.credit.source} rel="noopener" target="_blank" title={`Photo: ${house.credit.author}, ${house.credit.license}`}
		>© {house.credit.author} · <span>{house.credit.license}</span></a
	>
	<a class="sr" href={licenseUrl(house.credit.license)} rel="license">{house.credit.license} license</a>
</div>

<style>
	.house {
		position: relative;
		border-radius: 20px;
		overflow: hidden;
		background: var(--line);
		box-shadow:
			0 2px 4px rgb(42 43 38 / 0.08),
			0 14px 34px rgb(42 43 38 / 0.14);
	}

	svg {
		display: block;
		width: 100%;
		aspect-ratio: 4 / 3;
		pointer-events: none;
	}

	.grime {
		transition: opacity 0.35s ease;
	}

	.grime.gone {
		opacity: 0;
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
		width: 22px;
		height: 7px;
		border-radius: 2px;
		background: #fbfaf7;
		box-shadow: 0 0 3px rgb(0 0 0 / 0.4);
	}

	.side {
		position: absolute;
		top: 50%;
		font-size: 3rem;
		line-height: 1;
		color: #fbfaf7;
		text-shadow: 0 1px 8px rgb(0 0 0 / 0.5);
		transform: translateY(-50%);
	}

	.side.left {
		left: 14px;
	}

	.side.right {
		right: 14px;
	}

	.credit {
		position: absolute;
		right: 10px;
		bottom: 8px;
		font-size: 0.7rem;
		color: #fbfaf7;
		text-decoration: none;
		text-shadow: 0 1px 3px rgb(0 0 0 / 0.7);
	}

	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
</style>
