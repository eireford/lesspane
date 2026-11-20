import { describe, expect, it } from 'vitest';
import { testimonials, visibleTestimonials } from './config';

describe('testimonials', () => {
	it('shows samples only in the demo', () => {
		expect(visibleTestimonials(true)).toEqual(testimonials);
		expect(visibleTestimonials(false).some((t) => t.sample)).toBe(false);
	});

	it('keeps every placeholder marked as a sample until real reviews arrive', () => {
		// Flip this test only when a real, permitted review is added with sample: false.
		expect(testimonials.length).toBeGreaterThan(0);
		expect(testimonials.every((t) => t.sample)).toBe(true);
	});
});
