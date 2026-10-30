<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import type { AddOnKey } from '$lib/config';
	import { licenseUrl, type HousePhoto, type Rect } from '$lib/photos';

	// The house photo is the quote form. Each window starts grimy (dirt = 1). Rubbing a window wipes
	// it clean (dirt = 0), which hands it to LessPane; tapping a clean window puts it back.
	// The first windows are the ones visible in the photo; the rest are "back and sides" tiles,
	// each a close-up crop of a photo window. The dirt effects come from <GrimeDefs>.
	let {
		house,
		dirt = $bindable(),
		inside,
		addons
	}: {
		house: HousePhoto;
		dirt: number[];
		inside: boolean;
		addons: AddOnKey[];
	} = $props();

	/** Pixels of rubbing it takes to wipe one window clean. */
	const RUB_PX = 120;
	/** A window this close to clean snaps to clean. */
	const SNAP = 0.25;

	const photo = $derived(house);
	const frontClean = $derived(dirt.slice(0, photo.windows.length).filter((d) => d === 0).length);
	const allClean = $derived(dirt.length > 0 && dirt.every((d) => d === 0));
	/** Until the first wipe, a hand glides over a window to show what to do. */
	let touched = $state(false);
	const hintAt = $derived(photo.windows[Math.floor(photo.windows.length / 2)]);
	/** Frame the house, not the whole photo, so windows are big enough to rub on a phone. */
	const view = $derived.by(() => {
		const xs = photo.windows.flatMap(([x, , w]) => [x, x + w]);
		const ys = photo.windows.flatMap(([, y, , h]) => [y, y + h]);
		let [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
		const mx = (x1 - x0) * 0.22;
		const my = (y1 - y0) * 0.22;
		[x0, x1, y0, y1] = [x0 - mx, x1 + mx, y0 - my * 1.2, y1 + my];
		// Keep it at least 4:3 landscape.
		const minW = ((y1 - y0) * 4) / 3;
		if (x1 - x0 < minW) {
			const grow = (minW - (x1 - x0)) / 2;
			[x0, x1] = [x0 - grow, x1 + grow];
		}
		const shift = Math.max(0, -x0) - Math.max(0, x1 - photo.width);
		[x0, x1] = [Math.max(0, x0 + shift), Math.min(photo.width, x1 + shift)];
		[y0, y1] = [Math.max(0, y0), Math.min(photo.height, y1)];
		return `${x0} ${y0} ${x1 - x0} ${y1 - y0}`;
	});
	const front = $derived(photo.windows.length);
	const tiles = $derived(
		Array.from({ length: Math.max(0, dirt.length - front) }, (_, j) => ({
			i: front + j,
			rect: photo.windows[j % front]
		}))
	);

	const has = (key: AddOnKey) => addons.includes(key);

	/** A tile shows its window plus a little of the wall around it. */
	function tileBox([x, y, w, h]: Rect) {
		const m = Math.max(w, h) * 0.18;
		return `${x - m} ${y - m} ${w + 2 * m} ${h + 2 * m}`;
	}

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
		if ((e.target as Element).closest('button, a')) return;
		touched = true;
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

{#snippet pane(i: number, [x, y, w, h]: Rect, label: string)}
	{@const d = dirt[i]}
	{@const clean = d === 0}
	<g
		class="win"
		data-win={i}
		role="checkbox"
		aria-checked={clean}
		aria-label={label}
		tabindex="0"
		onkeydown={(e) => onKey(e, i)}
	>
		{#if !(clean && inside)}
			<!-- Hand smears on the inside of the glass -->
			<ellipse cx={x + w * 0.32} cy={y + h * 0.62} rx={w * 0.3} ry={h * 0.16} fill="url(#smear)" />
		{/if}
		{#if !(clean && has('hard_water'))}
			<rect {x} {y} width={w} height={h} filter="url(#mineral)" />
		{/if}
		{#if !(clean && has('screens'))}
			<rect {x} y={y + h / 2} width={w} height={h / 2} fill="url(#mesh)" />
		{/if}
		{#if !(clean && has('tracks'))}
			<rect {x} y={y + h * 0.93} width={w} height={h * 0.07} fill="#4f4130" opacity="0.7" />
		{/if}
		<rect {x} {y} width={w} height={h} filter="url(#grime)" opacity={d} />
		{#if clean}
			<rect class="shine" {x} {y} width={w} height={h} fill="#ffffff" />
		{/if}
		<rect class="hit" {x} {y} width={w} height={h} fill="transparent" />
	</g>
{/snippet}

<div
	class="stage"
	role="group"
	aria-label="Your house. Rub or tap each window you want us to clean."
	onpointerdown={onDown}
	onpointermove={onMove}
	onpointerup={onUp}
	onpointercancel={onUp}
>
	<div class="frame">
	<svg class="photo" viewBox={view}>
		<image href={photo.src} width={photo.width} height={photo.height} preserveAspectRatio="xMidYMid slice">
			<title>{photo.name}</title>
		</image>
		{#each photo.windows as rect, i (photo.id + i)}
			{@render pane(i, rect, `Front window ${i + 1}`)}
		{/each}
		{#if !touched && frontClean === 0 && hintAt}
			{@const [hx, hy, hw, hh] = hintAt}
			{@const k = Math.max(hw, hh) / 14}
			<g class="hint" style="--dx: {hw * 0.9}px" aria-hidden="true">
				<g transform="translate({hx + hw * 0.1} {hy + hh * 0.45}) scale({k})">
					<circle cx="9" cy="5" r="7" fill="#ffffff" opacity="0.35" />
					<path
						d="M9 11V5.5a1.5 1.5 0 013 0V10m0-1V7.5a1.5 1.5 0 013 0V11m0-1a1.5 1.5 0 013 0v4a6 6 0 01-6 6h-.5a6 6 0 01-5.2-3l-2.1-3.6a1.5 1.5 0 012.6-1.5L9 14"
						fill="#fbfaf7"
						stroke="#2a2b26"
						stroke-width="1.4"
						stroke-linejoin="round"
					/>
				</g>
			</g>
		{/if}
	</svg>
	{#if allClean}
		{#key photo.id}
			<div class="cheer" aria-hidden="true"><Icon name="sparkle" size={64} /></div>
		{/key}
	{/if}
	</div>

	{#if tiles.length}
		<p class="tiles-label"><Icon name="back" size={18} label="Around the back and sides" /></p>
		<div class="tiles">
			{#each tiles as t (t.i)}
				<svg class="tile" viewBox={tileBox(t.rect)}>
					<image href={photo.src} width={photo.width} height={photo.height} />
					{@render pane(t.i, t.rect, `Back or side window ${t.i - front + 1}`)}
				</svg>
			{/each}
		</div>
	{/if}
</div>

<p class="credit">
	<a href={photo.credit.source} rel="noopener" target="_blank">© {photo.credit.author}</a> ·
	<a href={licenseUrl(photo.credit.license)} rel="noopener license" target="_blank">{photo.credit.license}</a> · dirt added
</p>

<style>
	.stage {
		position: relative;
		/* Rubbing must not scroll the page. */
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		cursor: grab;
	}

	.stage:active {
		cursor: grabbing;
	}

	.photo {
		display: block;
		width: 100%;
		height: auto;
		border-radius: var(--radius);
		box-shadow: var(--shadow);
		background: var(--line);
	}

	.tiles-label {
		margin: 12px 0 6px;
		color: var(--ink-soft);
	}

	.frame {
		position: relative;
	}

	.hint {
		animation: glide 1.8s ease-in-out infinite;
		pointer-events: none;
	}

	@keyframes glide {
		0%,
		100% {
			transform: translateX(0);
		}
		50% {
			transform: translateX(var(--dx));
		}
	}

	.cheer {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: #fbfaf7;
		filter: drop-shadow(0 2px 8px rgb(0 0 0 / 0.35));
		pointer-events: none;
		animation: cheer 1.6s ease-out forwards;
	}

	@keyframes cheer {
		0% {
			opacity: 0;
			transform: scale(0.4) rotate(-20deg);
		}
		30% {
			opacity: 1;
			transform: scale(1.3) rotate(10deg);
		}
		100% {
			opacity: 0;
			transform: scale(1) rotate(0deg);
		}
	}

	.tiles {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
		gap: 8px;
	}

	.tile {
		display: block;
		width: 100%;
		aspect-ratio: 3 / 4;
		border-radius: 6px;
		background: var(--line);
	}

	.win {
		outline: none;
	}

	.win:focus-visible .hit {
		stroke: var(--accent);
		stroke-width: 4;
	}

	.shine {
		animation: shine 0.8s ease-out forwards;
		pointer-events: none;
	}

	@keyframes shine {
		from {
			opacity: 0.55;
		}
		to {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.shine,
		.cheer {
			animation: none;
			opacity: 0;
		}

		.hint {
			animation: none;
		}
	}

	.credit {
		margin: 6px 0 0;
		font-size: 0.75rem;
		color: var(--ink-soft);
	}

	.credit a {
		color: inherit;
	}
</style>
