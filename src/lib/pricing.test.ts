import { describe, expect, it } from 'vitest';
import { computeQuote } from './pricing';
import { pricing } from './config';

const p = {
	...pricing,
	perWindow: 10,
	minimum: 100,
	roundTo: 5,
	storyFactor: { 1: 1, 2: 1.2, 3: 1.5 },
	serviceFactor: { exterior: 1, interior_exterior: 1.8 },
	addOns: {
		screens: { label: 'Screens', price: 25, per: 'visit' },
		tracks: { label: 'Tracks', price: 30, per: 'visit' },
		hard_water: { label: 'Hard water', price: 4, per: 'window' }
	}
} as typeof pricing;

describe('computeQuote', () => {
	it('multiplies windows by rate and factors', () => {
		const q = computeQuote({ windows: 20, stories: 2, service: 'interior_exterior', addons: [] }, p);
		// 20 × 10 × 1.2 × 1.8 = 432 → rounds to 430
		expect(q.subtotal).toBe(432);
		expect(q.total).toBe(430);
		expect(q.minimumApplied).toBe(false);
	});

	it('adds each add-on once, even if repeated', () => {
		const q = computeQuote(
			{ windows: 20, stories: 1, service: 'exterior', addons: ['screens', 'screens', 'tracks'] },
			p
		);
		// 200 + 25 + 30
		expect(q.total).toBe(255);
		expect(q.lines).toHaveLength(3);
	});

	it('charges per-window add-ons for every window', () => {
		const q = computeQuote({ windows: 20, stories: 2, service: 'exterior', addons: ['hard_water'] }, p);
		// 20 × 10 × 1.2 = 240, plus 20 × 4 = 80; story factor does not apply to add-ons
		expect(q.lines[1]).toEqual({ label: 'Hard water (20 × $4)', amount: 80 });
		expect(q.total).toBe(320);
	});

	it('never goes below the minimum job price', () => {
		const q = computeQuote({ windows: 3, stories: 1, service: 'exterior', addons: [] }, p);
		expect(q.total).toBe(100);
		expect(q.minimumApplied).toBe(true);
	});

	it('rounds to the nearest $5', () => {
		const q = computeQuote({ windows: 13, stories: 1, service: 'exterior', addons: [] }, p);
		// 130 exactly
		expect(q.total).toBe(130);
		const q2 = computeQuote({ windows: 11, stories: 3, service: 'exterior', addons: [] }, p);
		// 11 × 10 × 1.5 = 165
		expect(q2.total).toBe(165);
	});
});
