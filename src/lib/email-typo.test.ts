import { describe, expect, it } from 'vitest';
import { suggestEmail } from './email-typo.ts';

describe('suggestEmail', () => {
	it('fixes common domain typos and keeps the name part', () => {
		expect(suggestEmail('Lee.Smith@gmial.com')).toBe('Lee.Smith@gmail.com');
		expect(suggestEmail('pat@yahoo.con')).toBe('pat@yahoo.com');
		expect(suggestEmail(' sam@Hotmial.com ')).toBe('sam@hotmail.com');
	});

	it('leaves correct and unknown domains alone', () => {
		expect(suggestEmail('lee@gmail.com')).toBeNull();
		expect(suggestEmail('owner@my-cleaning-co.com')).toBeNull();
		expect(suggestEmail('not an email')).toBeNull();
		expect(suggestEmail('@gmial.com')).toBeNull();
	});
});
