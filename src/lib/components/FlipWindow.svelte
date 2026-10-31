<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import SketchWindow from '$lib/components/SketchWindow.svelte';

	// A sketched window that flips like a card: the outside face (sun and shrubs) means outside only,
	// the inside face (curtains, a smudge) means both sides. Tap or flick it sideways.
	let { inside = $bindable(), extra }: { inside: boolean; extra: string } = $props();

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
			<svg viewBox="0 0 120 160" aria-hidden="true">
				<g fill="none" stroke="var(--ink)" stroke-width="1.5" stroke-linecap="round" filter="url(#pencil)">
					<!-- Sun, siding and a shrub: we're outside -->
					<circle cx="98" cy="18" r="8" />
					<path d="M98 4v4M98 28v4M84 18h4M108 18h4M88 8l3 3M105 25l3 3M108 8l-3 3M88 28l3 -3" />
					<path d="M0 132 H120 M0 144 H120 M0 156 H120" stroke-width="0.8" opacity="0.5" />
					<path d="M6 160 q6 -20 16 -6 q6 -14 14 2 q6 -10 10 4" />
					<path d="M84 160 q6 -16 14 -4 q6 -12 12 2 q4 -6 8 2" />
				</g>
				<SketchWindow rect={[26, 30, 68, 92]} />
			</svg>
			<span class="badge"><Icon name="sun" size={24} /></span>
		</span>
		<span class="face back">
			<svg viewBox="0 0 120 160" aria-hidden="true">
				<SketchWindow rect={[26, 30, 68, 92]} smudges />
				<g fill="none" stroke="var(--ink)" stroke-width="1.4" stroke-linecap="round" filter="url(#pencil)">
					<!-- Curtains and a rod: we're inside -->
					<path d="M14 24 H106" stroke-width="2" />
					<path d="M18 24 q6 40 -2 104 M24 24 q6 40 0 104 M30 24 q4 30 -2 60 q-4 24 2 44" />
					<path d="M102 24 q-6 40 2 104 M96 24 q-6 40 0 104 M90 24 q-4 30 2 60 q4 24 -2 44" />
					<path d="M8 140 H112" stroke-width="2" />
				</g>
			</svg>
			<span class="badge"><Icon name="sun" size={20} /><Icon name="hand" size={20} /></span>
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
		transform-style: preserve-3d;
		transition: transform 0.6s cubic-bezier(0.3, 1.4, 0.5, 1);
	}

	.inside .card {
		transform: rotateY(180deg);
	}

	.face {
		position: absolute;
		inset: 0;
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		overflow: hidden;
		backface-visibility: hidden;
		background: var(--paper);
		box-shadow: var(--shadow);
	}

	.back {
		transform: rotateY(180deg);
		background: #faf3e3;
	}

	.face svg {
		display: block;
		width: 100%;
		height: 100%;
	}

	.badge {
		position: absolute;
		left: 8px;
		bottom: 8px;
		display: inline-flex;
		gap: 2px;
		padding: 6px;
		border: 1.5px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--paper);
		color: var(--ink);
	}

	.extra {
		position: absolute;
		right: 8px;
		top: 8px;
		padding: 0 8px;
		border: 1.5px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--paper);
		font-family: var(--hand);
		font-size: 1.05rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.card {
			transition: none;
		}
	}
</style>
