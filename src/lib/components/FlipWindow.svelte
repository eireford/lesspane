<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { biggestWindow, windowBox, type HousePhoto } from '$lib/photos';

	// One window from the chosen house that flips like a card: the outside face means outside only,
	// the inside face (warm room light, a hand print) means both sides. Tap or flick it sideways.
	let { house, inside = $bindable(), extra }: { house: HousePhoto; inside: boolean; extra: string } = $props();

	const rect = $derived(biggestWindow(house));
	let startX = 0;
	let moved = false;

	function onDown(e: PointerEvent) {
		startX = e.clientX;
		moved = false;
	}

	function onMove(e: PointerEvent) {
		if (e.buttons && Math.abs(e.clientX - startX) > 40 && !moved) {
			moved = true;
			inside = !inside;
		}
	}
</script>

<button
	type="button"
	class="flip"
	class:inside
	aria-pressed={inside}
	aria-label={inside ? 'Cleaning both sides of the glass. Flip for outside only.' : 'Cleaning the outside only. Flip to add the inside.'}
	onpointerdown={onDown}
	onpointermove={onMove}
	onclick={() => {
		if (!moved) inside = !inside;
	}}
>
	<span class="card">
		<span class="face front">
			<svg viewBox={windowBox(rect, 0.35)} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
				<image href={house.src} width={house.width} height={house.height} />
			</svg>
			<span class="badge"><Icon name="sun" size={26} /></span>
		</span>
		<span class="face back">
			<svg viewBox={windowBox(rect, 0.35)} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
				<g transform="scale(-1 1)" style="transform-origin: center; transform-box: fill-box">
					<image href={house.src} width={house.width} height={house.height} />
				</g>
			</svg>
			<span class="room"></span>
			<span class="badge"><Icon name="sun" size={22} /><Icon name="hand" size={22} /></span>
			<span class="extra">{extra}</span>
		</span>
	</span>
</button>

<style>
	.flip {
		display: block;
		width: 100%;
		padding: 0;
		border: 0;
		background: none;
		perspective: 900px;
		cursor: pointer;
		touch-action: pan-y;
	}

	.flip:focus-visible .card {
		outline: 3px solid var(--accent);
		outline-offset: 3px;
	}

	.card {
		position: relative;
		display: block;
		aspect-ratio: 3 / 4;
		border-radius: 16px;
		transform-style: preserve-3d;
		transition: transform 0.6s cubic-bezier(0.3, 1.4, 0.5, 1);
	}

	.inside .card {
		transform: rotateY(180deg);
	}

	.face {
		position: absolute;
		inset: 0;
		border-radius: 16px;
		overflow: hidden;
		backface-visibility: hidden;
		box-shadow: var(--shadow);
		background: var(--line);
	}

	.back {
		transform: rotateY(180deg);
	}

	.face svg {
		display: block;
		width: 100%;
		height: 100%;
	}

	.room {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at 50% 70%, rgb(255 214 150 / 0.55), rgb(80 55 30 / 0.35));
		mix-blend-mode: multiply;
	}

	.badge {
		position: absolute;
		left: 10px;
		bottom: 10px;
		display: inline-flex;
		gap: 2px;
		padding: 8px;
		border-radius: 12px;
		background: rgb(251 250 247 / 0.92);
		color: var(--brand);
	}

	.extra {
		position: absolute;
		right: 10px;
		top: 10px;
		padding: 2px 8px;
		border-radius: 999px;
		background: var(--brand);
		color: var(--brand-ink);
		font-weight: 700;
		font-size: 0.85rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.card {
			transition: none;
		}
	}
</style>
