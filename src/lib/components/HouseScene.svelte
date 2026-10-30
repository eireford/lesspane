<script lang="ts">
	import type { AddOnKey, Stories } from '$lib/config';

	// The house is the quote form. Each window starts grimy (dirt = 1). Rubbing a window wipes it
	// clean (dirt = 0), which hands it to LessPane; tapping a clean window puts it back.
	let {
		stories,
		dirt = $bindable(),
		inside,
		addons
	}: { stories: Stories; dirt: number[]; inside: boolean; addons: AddOnKey[] } = $props();

	const WIN_W = 26;
	const WIN_H = 34;
	const GAP = 12;
	const FLOOR_H = 62;
	const PAD = 18;
	const DOOR_W = 30;
	const ROOF_H = 48;
	const TOP = 34;
	/** Pixels of rubbing it takes to wipe one window clean. */
	const RUB_PX = 140;
	/** A window this close to clean snaps to clean. */
	const SNAP = 0.25;

	const perFloor = $derived(Math.max(2, Math.ceil(dirt.length / stories)));
	const houseW = $derived(PAD * 2 + perFloor * WIN_W + perFloor * GAP + DOOR_W);
	const sceneW = $derived(Math.max(houseW + 130, 340));
	const houseX = $derived((sceneW - houseW) / 2);
	const houseTop = TOP + ROOF_H;
	const groundY = $derived(houseTop + stories * FLOOR_H);
	const sceneH = $derived(groundY + 40);

	const windows = $derived(
		dirt.map((_, i) => {
			const floor = Math.min(Math.floor(i / perFloor), stories - 1);
			const inRow = floor === stories - 1 ? dirt.length - floor * perFloor : perFloor;
			const col = i - floor * perFloor;
			const rowOffset = ((perFloor - inRow) * (WIN_W + GAP)) / 2;
			return {
				i,
				floor,
				x: houseX + PAD + rowOffset + col * (WIN_W + GAP),
				y: groundY - (floor + 1) * FLOOR_H + (FLOOR_H - WIN_H) / 2 - 4
			};
		})
	);

	const has = (key: AddOnKey) => addons.includes(key);

	// ---------- Wiping ----------

	let dragging = false;
	let moved = 0;
	let downOn: number | null = null;
	let last = { x: 0, y: 0 };

	function windowAt(x: number, y: number): number | null {
		const el = document.elementFromPoint(x, y)?.closest('[data-win]');
		return el ? Number(el.getAttribute('data-win')) : null;
	}

	function onDown(e: PointerEvent) {
		dragging = true;
		moved = 0;
		last = { x: e.clientX, y: e.clientY };
		downOn = windowAt(e.clientX, e.clientY);
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
	}

	function onMove(e: PointerEvent) {
		if (!dragging) return;
		const dist = Math.hypot(e.clientX - last.x, e.clientY - last.y);
		last = { x: e.clientX, y: e.clientY };
		moved += dist;
		const i = windowAt(e.clientX, e.clientY);
		if (i === null || dirt[i] === 0) return;
		const next = dirt[i] - dist / RUB_PX;
		dirt[i] = next <= SNAP ? 0 : next;
	}

	function onUp() {
		// A tap (no real rubbing) toggles the window it started on.
		if (dragging && moved < 8 && downOn !== null) toggle(downOn);
		dragging = false;
		downOn = null;
	}

	function toggle(i: number) {
		dirt[i] = dirt[i] === 0 ? 1 : 0;
	}

	function onKey(e: KeyboardEvent, i: number) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggle(i);
		}
	}
</script>

<svg
	class="scene"
	viewBox="0 0 {sceneW} {sceneH}"
	role="group"
	aria-label="Your house. Rub or tap each window you want us to clean."
	onpointerdown={onDown}
	onpointermove={onMove}
	onpointerup={onUp}
	onpointercancel={onUp}
>
	<defs>
		<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#cfe3e6" />
			<stop offset="1" stop-color="#f3ead6" />
		</linearGradient>
		<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#d9eef2" />
			<stop offset="0.55" stop-color="#8fbfca" />
			<stop offset="1" stop-color="#5d93a1" />
		</linearGradient>
		<pattern id="grime" width="10" height="10" patternUnits="userSpaceOnUse">
			<rect width="10" height="10" fill="#8f7d58" opacity="0.82" />
			<circle cx="3" cy="3" r="2.2" fill="#6c5c3f" opacity="0.7" />
			<circle cx="8" cy="7" r="1.6" fill="#a6936b" opacity="0.8" />
		</pattern>
		<pattern id="mineral" width="7" height="7" patternUnits="userSpaceOnUse">
			<circle cx="2" cy="2" r="1.1" fill="#ffffff" opacity="0.85" />
			<circle cx="5.5" cy="5" r="0.8" fill="#ffffff" opacity="0.7" />
		</pattern>
		<pattern id="mesh" width="3" height="3" patternUnits="userSpaceOnUse">
			<path d="M0 0H3M0 0V3" stroke="#4d4a40" stroke-width="0.6" opacity="0.6" />
		</pattern>
	</defs>

	<!-- Sky, sun, far tree line and marsh -->
	<rect width={sceneW} height={sceneH} fill="url(#sky)" />
	<circle cx={sceneW - 42} cy="30" r="15" fill="#e8b452" opacity="0.9" />
	<path
		d="M0 {groundY - 18} Q {sceneW * 0.25} {groundY - 34} {sceneW * 0.5} {groundY - 20} T {sceneW} {groundY - 22} V {groundY} H 0 Z"
		fill="#7f9a6a"
		opacity="0.55"
	/>

	<!-- Loblolly pines -->
	{#each [houseX - 34, houseX + houseW + 34] as tx}
		<rect x={tx - 3} y={groundY - 42} width="6" height="42" fill="#6e5038" />
		<path d="M{tx} {groundY - 110} l-20 34 h11 l-15 26 h48 l-15 -26 h11 Z" fill="#355e3b" />
	{/each}

	<!-- House -->
	<path
		d="M{houseX - 10} {houseTop} L{houseX + houseW / 2} {TOP} L{houseX + houseW + 10} {houseTop} Z"
		fill="#5a4636"
	/>
	<rect x={houseX} y={houseTop} width={houseW} height={stories * FLOOR_H} fill="#efe6d2" />
	{#each Array.from({ length: stories * 6 }, (_, k) => k) as k}
		<line
			x1={houseX}
			x2={houseX + houseW}
			y1={houseTop + (k + 1) * (FLOOR_H / 6)}
			y2={houseTop + (k + 1) * (FLOOR_H / 6)}
			stroke="#ddd1b6"
			stroke-width="1"
		/>
	{/each}
	<rect x={houseX + houseW - PAD - DOOR_W} y={groundY - 46} width={DOOR_W} height="46" rx="2" fill="#2f6b45" />
	<circle cx={houseX + houseW - PAD - 7} cy={groundY - 22} r="1.8" fill="#e8b452" />

	<!-- Windows -->
	{#each windows as w (w.i)}
		{@const d = dirt[w.i]}
		{@const clean = d === 0}
		<g
			class="win"
			class:clean
			data-win={w.i}
			role="checkbox"
			aria-checked={clean}
			aria-label="Window {w.i + 1}, floor {w.floor + 1}"
			tabindex="0"
			onkeydown={(e) => onKey(e, w.i)}
		>
			<rect x={w.x - 3} y={w.y - 3} width={WIN_W + 6} height={WIN_H + 6} rx="2" fill="#fffdf7" />
			<rect x={w.x} y={w.y} width={WIN_W} height={WIN_H} fill="url(#glass)" />
			<path
				d="M{w.x + 4} {w.y + WIN_H - 6} L{w.x + WIN_W - 8} {w.y + 4} M{w.x + 10} {w.y + WIN_H - 4} L{w.x + WIN_W - 3} {w.y + 10}"
				stroke="#ffffff"
				stroke-width="2"
				opacity={0.15 + 0.6 * (1 - d)}
			/>
			{#if !(clean && inside)}
				<!-- Inside smudge (a hand print), gone when inside cleaning is on -->
				<ellipse cx={w.x + 8} cy={w.y + 10} rx="4" ry="5" fill="#b9ad8e" opacity="0.55" />
			{/if}
			{#if !(clean && has('hard_water'))}
				<rect x={w.x} y={w.y} width={WIN_W} height={WIN_H} fill="url(#mineral)" opacity="0.7" />
			{/if}
			{#if !(clean && has('screens'))}
				<rect x={w.x} y={w.y + WIN_H / 2} width={WIN_W} height={WIN_H / 2} fill="url(#mesh)" />
			{/if}
			<rect x={w.x} y={w.y} width={WIN_W} height={WIN_H} fill="url(#grime)" opacity={d} />
			<line x1={w.x} x2={w.x + WIN_W} y1={w.y + WIN_H / 2} y2={w.y + WIN_H / 2} stroke="#fffdf7" stroke-width="2" />
			<!-- Sill and track -->
			<rect
				x={w.x - 5}
				y={w.y + WIN_H + 3}
				width={WIN_W + 10}
				height="4"
				rx="1"
				fill={clean && has('tracks') ? '#fffdf7' : '#8a7550'}
			/>
			{#if clean}
				<path
					class="sparkle"
					d="M{w.x + WIN_W - 3} {w.y - 8} l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z"
					fill="#e8b452"
				/>
			{/if}
		</g>
	{/each}

	<!-- Lawn -->
	<rect x="0" y={groundY} width={sceneW} height={sceneH - groundY} fill="#6f8f4f" />
	<rect x="0" y={groundY} width={sceneW} height="4" fill="#5d7d42" />
</svg>

<style>
	.scene {
		display: block;
		width: 100%;
		height: auto;
		max-height: 62vh;
		border-radius: var(--radius);
		/* Rubbing must not scroll the page. */
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		cursor: grab;
		box-shadow: var(--shadow);
	}

	.scene:active {
		cursor: grabbing;
	}

	.win {
		outline: none;
	}

	.win:focus-visible rect:first-child {
		stroke: var(--accent);
		stroke-width: 3;
	}

	.sparkle {
		transform-box: fill-box;
		transform-origin: center;
		animation: pop 0.7s ease-out forwards;
	}

	@keyframes pop {
		0% {
			transform: scale(0.2) rotate(0deg);
			opacity: 0;
		}
		40% {
			transform: scale(1.4) rotate(30deg);
			opacity: 1;
		}
		100% {
			transform: scale(1) rotate(45deg);
			opacity: 0.85;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sparkle {
			animation: none;
		}
	}
</style>
