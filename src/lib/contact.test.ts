import { describe, expect, it } from 'vitest';
import { contactLine, displayName, firstName, place } from './contact';

describe('contact details', () => {
	const full = { name: 'Pat Doe', phone: '(410) 555-0100', email: 'pat@example.com', address: '12 Goldsborough St', zip: '21601' };
	const bare = { name: '', phone: '', email: 'pat@example.com', address: '', zip: '' };

	it('reads naturally with everything given', () => {
		expect([firstName(full), displayName(full), contactLine(full), place(full)]).toEqual([
			'Pat',
			'Pat Doe',
			'Pat Doe · (410) 555-0100 · pat@example.com',
			'12 Goldsborough St 21601'
		]);
	});

	it('falls back to the email when only that was given', () => {
		expect([firstName(bare), displayName(bare), contactLine(bare), place(bare)]).toEqual(['', 'pat@example.com', 'pat@example.com', '']);
	});
});
