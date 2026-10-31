import type { Stories } from './config';

// The house as the quote steps build it: how many floors, how many sides get cleaned, and for each side
// and floor a bucket of windows. Buckets keep it quick ("3–4" rather than an exact count); each bucket
// prices at its `count`, which leans to the top of the range so the estimate doesn't come in low.

export type Sides = 1 | 2 | 3 | 4;

/** x, y, width, height of something drawn on a sketch canvas. */
export type Rect = [number, number, number, number];

export type Layout = {
	floors: Stories;
	sides: Sides;
	/** windows[side][floor] = index into BUCKETS */
	windows: number[][];
};

export const BUCKETS = [
	{ label: 'None', count: 0 },
	{ label: '1–2', count: 2 },
	{ label: '3–4', count: 4 },
	{ label: '5–6', count: 6 },
	{ label: '7–9', count: 8 },
	{ label: '10+', count: 12 }
] as const;

export const SIDE_NAMES = ['Front', 'Back', 'Left side', 'Right side'] as const;
export const SIDE_CHOICES: Record<Sides, string> = {
	1: 'Front only',
	2: 'Front & back',
	3: 'Three sides',
	4: 'All four sides'
};
export const FLOOR_NAMES = ['Ground floor', '2nd floor', '3rd floor'] as const;

/** Front and back usually have more windows than the ends of a house. */
export const defaultBucket = (side: number): number => (side < 2 ? 2 : 1);

export function defaultLayout(floors: Stories = 2, sides: Sides = 4): Layout {
	return {
		floors,
		sides,
		windows: Array.from({ length: sides }, (_, s) => Array.from({ length: floors }, () => defaultBucket(s)))
	};
}

/** Changes floors or sides, keeping every bucket already chosen. */
export function resize(l: Layout, floors: Stories, sides: Sides): Layout {
	return {
		floors,
		sides,
		windows: Array.from({ length: sides }, (_, s) =>
			Array.from({ length: floors }, (_, f) => l.windows[s]?.[f] ?? defaultBucket(s))
		)
	};
}

export const windowsOn = (l: Layout, side: number) =>
	l.windows[side].reduce((n, b) => n + BUCKETS[b].count, 0);

export const totalWindows = (l: Layout) => l.windows.reduce((n, _, s) => n + windowsOn(l, s), 0);

/** For the query string: f=2&s=4&w=2,2,2,2,1,1,1,1 (side by side, ground floor up). */
export function layoutToSearchParams(l: Layout): URLSearchParams {
	return new URLSearchParams({ f: String(l.floors), s: String(l.sides), w: l.windows.flat().join(',') });
}

type Source = URLSearchParams | FormData;

export function parseLayout(src: Source): Layout | null {
	const floors = Number(src.get('f'));
	const sides = Number(src.get('s'));
	if (![1, 2, 3].includes(floors) || ![1, 2, 3, 4].includes(sides)) return null;
	const flat = String(src.get('w') ?? '').split(',').map(Number);
	if (flat.length !== floors * sides) return null;
	if (flat.some((b) => !Number.isInteger(b) || b < 0 || b >= BUCKETS.length)) return null;
	const windows = Array.from({ length: sides }, (_, s) => flat.slice(s * floors, s * floors + floors));
	return { floors: floors as Stories, sides: sides as Sides, windows };
}

/** One line per side for the owner, e.g. "Front: ground 3–4, 2nd 3–4". */
export function describeLayout(l: Layout): string {
	return l.windows
		.map(
			(floors, s) =>
				`${SIDE_NAMES[s]}: ${floors.map((b, f) => `${FLOOR_NAMES[f].split(' ')[0].toLowerCase()} ${BUCKETS[b].label}`).join(', ')}`
		)
		.join('; ');
}
