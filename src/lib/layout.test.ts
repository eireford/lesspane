import { describe, expect, it } from 'vitest';
import { defaultLayout, describeLayout, layoutToSearchParams, parseLayout, resize, totalWindows } from './layout';

describe('layout', () => {
	it('starts with sensible defaults: front and back 3–4 per floor, ends 1–2', () => {
		const l = defaultLayout(2, 4);
		// (4 + 4) front, (4 + 4) back, (2 + 2) each end
		expect(totalWindows(l)).toBe(24);
	});

	it('keeps chosen buckets when floors or sides change', () => {
		const l = defaultLayout(2, 2);
		l.windows[0][1] = 5;
		const bigger = resize(l, 3, 4);
		expect(bigger.windows[0][1]).toBe(5);
		expect(bigger.windows).toHaveLength(4);
		expect(bigger.windows[3]).toHaveLength(3);
	});

	it('round-trips through the query string', () => {
		const l = resize(defaultLayout(3, 3), 3, 3);
		l.windows[2][0] = 0;
		expect(parseLayout(layoutToSearchParams(l))).toEqual(l);
	});

	it('rejects a layout whose window list does not match floors × sides', () => {
		expect(parseLayout(new URLSearchParams('f=2&s=2&w=1,1,1'))).toBeNull();
		expect(parseLayout(new URLSearchParams('f=2&s=1&w=1,9'))).toBeNull();
	});

	it('describes each side for the owner', () => {
		expect(describeLayout(defaultLayout(1, 2))).toBe('Front: ground 3–4; Back: ground 3–4');
	});
});
