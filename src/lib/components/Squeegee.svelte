<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';

	// A strip of grimy glass with a squeegee on it. Pull the squeegee right to wipe more windows;
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
			<rect width="100%" height="100%" filter="url(#grime)" />
		</svg>
		<div class="wiped" style="width: {pct}%"></div>
		<!-- Mullions every five windows, like a run of panes -->
		<div class="panes" aria-hidden="true">
			{#each Array(Math.floor((max - min) / 5)) as _, k}<i style="left: {(((k + 1) * 5) / (max - min)) * 100}%"></i>{/each}
		</div>
		<div class="blade" class:dragging style="left: {pct}%" aria-hidden="true">
			<span class="count"><Icon name="window" size={16} />{value}</span>
			<svg viewBox="0 0 40 90" class="tool">
				<rect x="16" y="0" width="8" height="34" rx="4" fill="#6f5b49" />
				<rect x="6" y="30" width="28" height="10" rx="3" fill="#4d5e47" />
				<rect x="18" y="38" width="4" height="52" rx="2" fill="#2a2b26" />
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
		border-radius: 10px;
		overflow: visible;
		background: linear-gradient(160deg, #d9e8ea, #9fc0c7 55%, #6d97a1);
		border: 4px solid #fbfaf7;
		box-shadow:
			0 0 0 1px var(--line),
			var(--shadow);
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
		border-radius: 6px;
	}

	.wiped {
		position: absolute;
		inset: 0 auto 0 0;
		border-radius: 6px 0 0 6px;
		background:
			linear-gradient(115deg, transparent 30%, rgb(255 255 255 / 0.55) 38%, transparent 46%),
			linear-gradient(160deg, #e3f0f2, #a9ccd3 55%, #78a2ac);
	}

	.panes i {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 3px;
		margin-left: -1.5px;
		background: #fbfaf7;
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
		filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.25));
	}

	.count {
		position: absolute;
		top: -6px;
		left: 50%;
		display: inline-flex;
		align-items: center;
		gap: 3px;
		padding: 2px 8px;
		border-radius: 999px;
		background: var(--brand);
		color: var(--brand-ink);
		font-weight: 700;
		font-size: 0.9rem;
		white-space: nowrap;
		transform: translate(-50%, -100%);
	}
</style>
