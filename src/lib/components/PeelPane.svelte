<script lang="ts">
	import Icon, { type IconName } from '$lib/components/Icon.svelte';
	import SketchWindow from '$lib/components/SketchWindow.svelte';
	import type { AddOnKey } from '$lib/config';

	// A sketched pane of glass with a sticker for each problem stuck on it. Peel a sticker off (drag it
	// away, or tap it) and that problem gets fixed; it drops into the tray below, where a tap sticks it back.
	let { addons = $bindable(), cost }: { addons: AddOnKey[]; cost: (key: AddOnKey) => string } = $props();

	const stickers: { key: AddOnKey; icon: IconName; label: string; short: string; at: [number, number]; color: string }[] = [
		{ key: 'hard_water', icon: 'drop', label: 'Hard-water spots', short: 'Hard water', at: [66, 22], color: '#bfe3f7' },
		{ key: 'screens', icon: 'mesh', label: 'Dusty screens', short: 'Screens', at: [32, 56], color: '#c9ecc0' },
		{ key: 'tracks', icon: 'track', label: 'Grimy tracks and sills', short: 'Tracks', at: [64, 82], color: '#ffd59e' }
	];

	const peeled = (key: AddOnKey) => addons.includes(key);

	let drag = $state<{ key: AddOnKey; dx: number; dy: number } | null>(null);
	let start = { x: 0, y: 0 };
	const PEEL_PX = 60;

	function onDown(e: PointerEvent, key: AddOnKey) {
		e.preventDefault();
		drag = { key, dx: 0, dy: 0 };
		start = { x: e.clientX, y: e.clientY };
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
	}

	function onMove(e: PointerEvent) {
		if (drag) drag = { ...drag, dx: e.clientX - start.x, dy: e.clientY - start.y };
	}

	function onUp() {
		if (!drag) return;
		const far = Math.hypot(drag.dx, drag.dy);
		// A tap peels too; a short wobble that isn't a tap snaps back.
		if (far > PEEL_PX || far < 6) addons = [...new Set([...addons, drag.key])];
		drag = null;
	}

	function stickBack(key: AddOnKey) {
		addons = addons.filter((a) => a !== key);
	}

	function onKey(e: KeyboardEvent, key: AddOnKey) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			addons = [...new Set([...addons, key])];
		}
	}
</script>

<div class="peel">
	<div class="pane">
		<svg viewBox="0 0 120 160" aria-hidden="true">
			<SketchWindow
				rect={[14, 12, 92, 128]}
				spots={!peeled('hard_water')}
				screens={!peeled('screens')}
				tracks={!peeled('tracks')}
				stroke={1.8}
			/>
		</svg>
		{#each stickers as s (s.key)}
			{#if !peeled(s.key)}
				{@const d = drag?.key === s.key ? drag : null}
				<button
					type="button"
					class="sticker"
					class:lifting={!!d}
					style="--tint: {s.color}; left: {s.at[0]}%; top: {s.at[1]}%; transform: translate(calc(-50% + {d?.dx ?? 0}px), calc(-50% + {d?.dy ?? 0}px)) rotate({(d?.dx ?? 0) / 6}deg) scale({d ? 1.15 : 1})"
					aria-label={`${s.label}: peel off to fix, adds ${cost(s.key)}`}
					onpointerdown={(e) => onDown(e, s.key)}
					onpointermove={onMove}
					onpointerup={onUp}
					onpointercancel={() => (drag = null)}
					onkeydown={(e) => onKey(e, s.key)}
				>
					<Icon name={s.icon} size={22} />
					<span class="name">{s.short}</span>
					<small>{cost(s.key)}</small>
				</button>
			{/if}
		{/each}
	</div>
	<div class="tray" aria-label="Fixed">
		{#each stickers as s (s.key)}
			{#if peeled(s.key)}
				<button type="button" class="chip" aria-label={`${s.label} fixed, ${cost(s.key)}. Tap to undo.`} onclick={() => stickBack(s.key)}>
					<Icon name="check" size={14} /><span class="name">{s.short}</span><small>{cost(s.key)}</small>
				</button>
			{:else}
				<span class="slot" aria-hidden="true">{s.short}</span>
			{/if}
		{/each}
	</div>
</div>

<style>
	.pane {
		position: relative;
		aspect-ratio: 3 / 4;
		border: 2px solid var(--ink);
		border-radius: var(--sketchy);
		overflow: hidden;
		background: var(--paper);
		box-shadow: var(--shadow);
	}

	.pane svg {
		display: block;
		width: 100%;
		height: 100%;
	}

	.sticker {
		position: absolute;
		display: grid;
		justify-items: center;
		gap: 0;
		width: 78px;
		height: 78px;
		padding: 9px 0 0;
		border: 2px solid var(--ink);
		border-radius: 52% 48% 55% 45% / 47% 53% 46% 54%;
		background: var(--tint);
		color: var(--ink);
		box-shadow: 2px 2px 0 rgb(43 42 38 / 0.18);
		cursor: grab;
		touch-action: none;
		transition: transform 0.2s ease;
	}

	/* Curled corner, like a real sticker */
	.sticker::after {
		content: '';
		position: absolute;
		right: 6px;
		bottom: 6px;
		width: 14px;
		height: 14px;
		border-radius: 0 0 50% 0;
		background: linear-gradient(135deg, #ffffff 50%, var(--ink) 50%);
	}

	.sticker.lifting {
		cursor: grabbing;
		transition: none;
		box-shadow: 0 10px 20px rgb(0 0 0 / 0.3);
		z-index: 2;
	}

	.sticker .name,
	.chip .name {
		font-family: var(--hand);
		font-size: 0.85rem;
		line-height: 1;
		white-space: nowrap;
	}

	.sticker small {
		font-family: var(--hand);
		font-size: 0.85rem;
		white-space: nowrap;
		font-weight: 700;
	}

	.sticker:focus-visible {
		outline: 3px solid var(--accent);
	}

	.tray {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
		margin-top: 8px;
	}

	.chip,
	.slot {
		min-height: 40px;
		border-radius: 999px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 2px;
		border: 1.5px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--brand-soft);
		color: var(--ink);
		font-family: var(--hand);
		cursor: pointer;
		animation: drop 0.35s cubic-bezier(0.3, 1.5, 0.5, 1);
	}

	.chip small {
		font-size: 0.95rem;
	}

	.slot {
		display: grid;
		place-items: center;
		border: 1.5px dashed var(--line);
		border-radius: var(--sketchy);
		font-family: var(--hand);
		font-size: 0.85rem;
		color: var(--ink-soft);
		opacity: 0.6;
	}

	@keyframes drop {
		from {
			transform: translateY(-30px) scale(0.6);
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.chip {
			animation: none;
		}
	}
</style>
