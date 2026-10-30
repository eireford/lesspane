<script lang="ts" module>
	// Line icons on a 24px grid. The quote screen speaks in pictures; words live in aria-labels.
	const paths = {
		left: 'M15 5l-7 7 7 7',
		right: 'M9 5l7 7-7 7',
		plus: 'M12 5v14M5 12h14',
		minus: 'M5 12h14',
		sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
		undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
		hand: 'M8 13V5.5a1.5 1.5 0 013 0V11m0-1.5V4a1.5 1.5 0 013 0v6m0-4.5a1.5 1.5 0 013 0V12m0-3.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1.5a6 6 0 01-4.6-2.2L4.3 16a1.5 1.5 0 012.3-1.9L8 15.5',
		mesh: 'M4 4h16v16H4zM4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16',
		track: 'M3 17h18M3 20h18M5 17V7a1 1 0 011-1h12a1 1 0 011 1v10M12 6v11',
		drop: 'M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11zM9.5 14.5a2.5 2.5 0 002.5 2.5',
		info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 7.5v.5',
		calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
		sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
		sunset: 'M3 18h18M7 18a5 5 0 0110 0M12 7v3M5.6 10.6l1.4 1.4M18.4 10.6L17 12M2 14h2M20 14h2',
		pin: 'M12 21s-7-6.2-7-12a7 7 0 0114 0c0 5.8-7 12-7 12zM12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
		user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
		phone: 'M7 3h10v18H7zM11 18h2',
		mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
		note: 'M5 4h14v16H5zM8 9h8M8 13h8M8 17h5',
		check: 'M5 12.5l4.5 4.5L19 7',
		window: 'M5 3h14v18H5zM5 12h14M12 3v18',
		back: 'M3 11l9-7 9 7M5 9.5V20h14V9.5M9 20v-5h6v5',
		swipe: 'M9 11V5.5a1.5 1.5 0 013 0V10m0-1V7.5a1.5 1.5 0 013 0V11m0-1a1.5 1.5 0 013 0v4a6 6 0 01-6 6h-.5a6 6 0 01-5.2-3l-2.1-3.6a1.5 1.5 0 012.6-1.5L9 14M3 5h3M3 8h2',
		home: 'M3 11l9-7 9 7M5 9.5V20h14V9.5',
		heart: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7a4.3 4.3 0 017.5 2.8C19.5 15.4 12 20 12 20z',
		x: 'M6 6l12 12M18 6L6 18',
		up: 'M6 14l6-6 6 6M6 20l6-6 6 6'
	};
	export type IconName = keyof typeof paths;
</script>

<script lang="ts">
	let { name, size = 24, label }: { name: IconName; size?: number; label?: string } = $props();
</script>

<svg
	class="icon"
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.8"
	stroke-linecap="round"
	stroke-linejoin="round"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
>
	<path d={paths[name]} />
</svg>

<style>
	.icon {
		display: inline-block;
		flex: none;
		vertical-align: middle;
	}
</style>
