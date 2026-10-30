<script lang="ts" module>
	export type SwipeDir = 'left' | 'right' | 'up';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	// A card you drag and fling. Past the threshold it flies off and reports the direction;
	// otherwise it springs back. Buttons can fling it too, through fling().
	let {
		dirs,
		onswipe,
		label,
		children
	}: {
		dirs: SwipeDir[];
		onswipe: (dir: SwipeDir) => void;
		label: string;
		/** Receives how far the card leans: -1 (left) … 1 (right), and 0 … 1 upward. */
		children: Snippet<[number, number]>;
	} = $props();

	const THRESHOLD = 90;

	let dx = $state(0);
	let dy = $state(0);
	let dragging = $state(false);
	let flying = $state(false);
	let start = { x: 0, y: 0 };

	const lean = $derived(Math.max(-1, Math.min(1, dx / THRESHOLD)));
	const rise = $derived(dirs.includes('up') ? Math.max(0, Math.min(1, -dy / THRESHOLD)) : 0);

	function onDown(e: PointerEvent) {
		if (flying || (e.target as Element).closest('button, a, input')) return;
		dragging = true;
		start = { x: e.clientX - dx, y: e.clientY - dy };
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
	}

	function onMove(e: PointerEvent) {
		if (!dragging) return;
		dx = dirs.includes('left') || dirs.includes('right') ? e.clientX - start.x : 0;
		dy = dirs.includes('up') ? Math.min(0, e.clientY - start.y) : 0;
	}

	function onUp() {
		if (!dragging) return;
		dragging = false;
		if (dx > THRESHOLD && dirs.includes('right')) fling('right');
		else if (dx < -THRESHOLD && dirs.includes('left')) fling('left');
		else if (dy < -THRESHOLD && dirs.includes('up')) fling('up');
		else dx = dy = 0;
	}

	export function fling(dir: SwipeDir) {
		if (flying) return;
		flying = true;
		const w = typeof window === 'undefined' ? 600 : window.innerWidth;
		if (dir === 'up') {
			dx = 0;
			dy = -w * 1.6;
		} else {
			dx = (dir === 'right' ? 1 : -1) * w * 1.3;
			dy = 30;
		}
		setTimeout(() => onswipe(dir), 260);
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowRight' && dirs.includes('right')) fling('right');
		else if (e.key === 'ArrowLeft' && dirs.includes('left')) fling('left');
		else if (e.key === 'ArrowUp' && dirs.includes('up')) fling('up');
		else return;
		e.preventDefault();
	}
</script>

<!-- Focusable so arrow keys can fling it; every deck also has buttons that do the same. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
	class="swipe"
	class:dragging
	class:vertical={dirs.includes('up')}
	style="transform: translate({dx}px, {dy}px) rotate({dx / 18}deg)"
	role="group"
	aria-label={label}
	tabindex="0"
	onpointerdown={onDown}
	onpointermove={onMove}
	onpointerup={onUp}
	onpointercancel={onUp}
	onkeydown={onKey}
>
	{@render children(lean, rise)}
</div>

<style>
	.swipe {
		position: relative;
		/* Horizontal decks still let the page scroll vertically. */
		touch-action: pan-y;
		user-select: none;
		-webkit-user-select: none;
		cursor: grab;
		transition: transform 0.26s cubic-bezier(0.2, 0.7, 0.3, 1);
		will-change: transform;
	}

	.swipe.vertical {
		touch-action: none;
	}

	.swipe.dragging {
		cursor: grabbing;
		transition: none;
	}

	.swipe:focus-visible {
		outline: 3px solid var(--accent);
		outline-offset: 4px;
		border-radius: 20px;
	}
</style>
