#!/usr/bin/env node
// Fills .data/requests.json (the local file store) with sample quote requests, so /admin has
// something to show. Local development only: it never touches Firestore.
//
//   npm run seed            # add 8 sample requests
//   npm run seed -- --reset # replace everything in the file with the samples

import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const FILE = path.resolve('.data', 'requests.json');
const reset = process.argv.includes('--reset');

const people = [
	['Avery Brooks', '21601', '12 Goldsborough St', 2],
	['Sam Whitaker', '21801', '405 Camden Ave', 1],
	['Jordan Price', '21842', '9 Bayshore Dr', 3],
	['Riley Chen', '21620', '210 High St', 2],
	['Morgan Tilghman', '21663', '33 Talbot St', 2],
	['Casey Ennis', '21613', '7 Mill St', 1],
	['Taylor Dukes', '21811', '118 Main St', 2],
	['Quinn Harper', '21921', '52 Bow St', 3]
];
const addOnSets = [[], ['screens'], ['tracks'], ['screens', 'hard_water'], [], ['hard_water'], ['screens', 'tracks'], []];
const statuses = ['new', 'new', 'new', 'confirmed', 'confirmed', 'done', 'new', 'cancelled'];

const day = (offset) => {
	const d = new Date();
	d.setDate(d.getDate() + offset);
	return d.toISOString().slice(0, 10);
};

const samples = people.map(([name, zip, address, stories], i) => {
	const windows = 12 + ((i * 7) % 20);
	return {
		id: randomUUID(),
		created_at: new Date(Date.now() - i * 5 * 3600_000).toISOString(),
		address,
		zip,
		stories,
		window_count: windows,
		service_type: i % 3 === 0 ? 'interior_exterior' : 'exterior',
		add_ons: addOnSets[i],
		// Rough figure for display; the real price is computed by the app at request time.
		quoted_price: Math.max(150, Math.round((windows * 7 * (i % 3 === 0 ? 1.7 : 1)) / 5) * 5),
		preferred_date: day(2 + i),
		preferred_window: i % 2 ? 'afternoon' : 'morning',
		name,
		phone: `410555${String(1000 + i).slice(-4)}`,
		email: `${name.split(' ')[0].toLowerCase()}@example.com`,
		notes: i % 4 === 0 ? 'Gate code 1234. Friendly dog.' : '',
		status: statuses[i]
	};
});

let existing = [];
if (!reset) {
	try {
		existing = JSON.parse(readFileSync(FILE, 'utf8'));
	} catch {}
}
mkdirSync(path.dirname(FILE), { recursive: true });
writeFileSync(FILE, JSON.stringify([...existing, ...samples], null, 2));
console.log(`${reset ? 'Replaced' : 'Added'} ${samples.length} sample requests in ${path.relative(process.cwd(), FILE)} (${existing.length + samples.length} total).`);
