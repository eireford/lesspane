<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	// A sketched strip of grimy glass with a squeegee on it. Pull the squeegee right to wipe more windows;
	// everything behind the blade is clean. It's a slider: arrow keys, Home and End work too.
	let { value = $bindable(), min = 1, max = 40 }: { value: number; min?: number; max?: number } = $props();

	let track = $state<HTMLElement>();
	let dragging = $state(false);

	const pct = $derived(((value - min) / (max - min)) * 100);

	function setFrom(clientX: number) {
		if (!track) return;
		const r = track.getBoundingClientRect();
		const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
		value = Math.round(min + f * (max - min));
	}

	function onDown(e: PointerEvent) {
		// Stop the browser starting a text selection, which would cancel the drag.
		e.preventDefault();
		dragging = true;
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
		setFrom(e.clientX);
	}

	function onMove(e: PointerEvent) {
		if (dragging) setFrom(e.clientX);
	}

	function onKey(e: KeyboardEvent) {
		const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[e.key];
		if (step) value = Math.min(max, Math.max(min, value + step));
		else if (e.key === 'Home') value = min;
		else if (e.key === 'End') value = max;
		else return;
		e.preventDefault();
	}
</script>

<div class="squeegee">
	<div
		class="glass"
		bind:this={track}
		role="slider"
		tabindex="0"
		aria-label="How many windows"
		aria-valuemin={min}
		aria-valuemax={max}
		aria-valuenow={value}
		aria-valuetext={`${value} windows`}
		onpointerdown={onDown}
		onpointermove={onMove}
		onpointerup={() => (dragging = false)}
		onpointercancel={() => (dragging = false)}
		onkeydown={onKey}
	>
		<svg class="dirt" preserveAspectRatio="none" aria-hidden="true">
			<rect width="100%" height="100%" fill="#c9b48e" opacity="0.55" />
			<rect width="100%" height="100%" fill="url(#hatch)" opacity="0.8" />
		</svg>
		<div class="wiped" style="width: {pct}%"></div>
		<!-- Mullions every five windows, like a run of panes -->
		<div class="panes" aria-hidden="true">
			{#each Array(Math.floor((max - min) / 5)) as _, k}<i style="left: {(((k + 1) * 5) / (max - min)) * 100}%"></i>{/each}
		</div>
		<div class="blade" class:dragging style="left: {pct}%" aria-hidden="true">
			<span class="count"><Icon name="window" size={16} />{value}</span>
			<!-- A pencil squeegee: handle, head, and the rubber blade across the glass -->
			<svg viewBox="0 0 40 90" class="tool" fill="none" stroke="var(--ink)" stroke-width="1.8" stroke-linecap="round">
				<g filter="url(#pencil)">
					<rect x="15" y="1" width="10" height="30" rx="5" fill="var(--sun)" />
					<rect x="5" y="30" width="30" height="9" rx="2" fill="var(--coral)" />
					<path d="M20 39 V89" stroke-width="3.5" />
				</g>
			</svg>
		</div>
	</div>
</div>

<style>
	.squeegee {
		padding: 40px 18px 4px;
	}

	.glass {
		position: relative;
		height: 64px;
		border-radius: var(--sketchy);
		overflow: visible;
		background: var(--paper);
		border: 2px solid var(--ink);
		box-shadow: var(--shadow);
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		cursor: ew-resize;
	}

	.glass:focus-visible {
		outline: 3px solid var(--accent);
		outline-offset: 3px;
	}

	.dirt {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border-radius: var(--sketchy);
	}

	.wiped {
		position: absolute;
		inset: 0 auto 0 0;
		border-radius: 255px 0 0 15px / 15px 0 0 255px;
		/* Clean paper with a few shine strokes */
		background:
			repeating-linear-gradient(120deg, transparent 0 34px, #ffffff 34px 37px, transparent 37px 46px),
			var(--glass);
	}

	.panes i {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		margin-left: -1px;
		background: var(--ink);
	}

	.blade {
		position: absolute;
		top: -36px;
		bottom: -14px;
		width: 40px;
		margin-left: -20px;
		pointer-events: none;
		transition: left 0.08s linear;
	}

	.blade.dragging {
		transition: none;
	}

	.tool {
		position: absolute;
		top: 0;
		left: 0;
		width: 40px;
		height: calc(100% - 0px);
		filter: drop-shadow(2px 2px 0 rgb(43 42 38 / 0.15));
	}

	.count {
		position: absolute;
		top: -6px;
		left: 50%;
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 0 8px;
		border: 1.5px solid var(--ink);
		border-radius: var(--sketchy);
		background: var(--highlight);
		color: var(--ink);
		font-family: var(--hand);
		font-size: 1.1rem;
		white-space: nowrap;
		transform: translate(-50%, -100%);
	}
</style>
