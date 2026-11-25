import type { AddOnKey, ServiceType, TimeWindow } from '#lib/config.ts';
import { PACKAGES, totalWindows, type Layout } from '#lib/layout.ts';
import { computeQuote } from '#lib/pricing.ts';
import { addDaysIso, todayIso } from '#lib/validation.ts';
import type { QuoteRequest, RequestStatus } from './store';

// Made-up requests for the demo's owner view (/owner), so visitors can see the owner's side without the
// real /admin page, which holds real people's details. Names are invented, emails use example.com and phones
// the 555-01xx range kept for fiction. Every price comes from computeQuote, like a real booking's.

type Sample = {
	name: string;
	address: string;
	zip: string;
	layout: Layout;
	service: ServiceType;
	addOns: AddOnKey[];
	/** Visit day, in days from today. */
	day: number;
	window: TimeWindow;
	status: RequestStatus;
	/** When the request came in, in hours before now. */
	hoursAgo: number;
	notes?: string;
	noPhone?: boolean;
};

const [cottage, family, large] = PACKAGES.map((p) => p.layout);
const lShape: Layout = { floors: 2, sides: 6, windows: [[3, 3], [2, 2], [1, 1], [1, 1], [1, 0], [2, 1]] };

const SAMPLES: Sample[] = [
	{ name: 'Avery Brooks', address: '12 Goldsborough St', zip: '21601', layout: family, service: 'interior_exterior', addOns: ['screens'], day: 3, window: 'morning', status: 'new', hoursAgo: 1, notes: 'Gate code 1234. Friendly dog.' },
	{ name: '', address: '', zip: '21801', layout: cottage, service: 'exterior', addOns: [], day: 4, window: 'afternoon', status: 'new', hoursAgo: 5, noPhone: true },
	{ name: 'Jordan Price', address: '9 Bayshore Dr', zip: '21842', layout: large, service: 'exterior', addOns: ['hard_water'], day: 2, window: 'morning', status: 'confirmed', hoursAgo: 26, notes: 'Salt haze on the bay side.' },
	{ name: 'Riley Chen', address: '210 High St', zip: '21620', layout: lShape, service: 'exterior', addOns: ['tracks'], day: 5, window: 'afternoon', status: 'confirmed', hoursAgo: 30 },
	{ name: 'Morgan Tilghman', address: '33 Talbot St', zip: '21663', layout: family, service: 'exterior', addOns: [], day: 1, window: 'afternoon', status: 'confirmed', hoursAgo: 52 },
	{ name: 'Casey Ennis', address: '7 Mill St', zip: '21613', layout: cottage, service: 'interior_exterior', addOns: ['screens', 'tracks'], day: 6, window: 'morning', status: 'new', hoursAgo: 60 },
	{ name: 'Taylor Dukes', address: '118 Main St', zip: '21811', layout: family, service: 'exterior', addOns: ['screens'], day: -2, window: 'morning', status: 'done', hoursAgo: 140 },
	{ name: 'Quinn Harper', address: '52 Bow St', zip: '21921', layout: large, service: 'exterior', addOns: [], day: 3, window: 'afternoon', status: 'cancelled', hoursAgo: 170 }
];

/** The sample requests, newest first, with visit days counted from `now` in the business's time zone. */
export function sampleRequests(now = new Date()): QuoteRequest[] {
	const today = todayIso(undefined, now);
	return SAMPLES.map((s, i) => {
		const windows = totalWindows(s.layout);
		const first = s.name.split(' ')[0].toLowerCase();
		return {
			id: `sample-${i + 1}`,
			created_at: new Date(now.getTime() - s.hoursAgo * 3600_000).toISOString(),
			address: s.address,
			zip: s.zip,
			stories: s.layout.floors,
			window_count: windows,
			service_type: s.service,
			add_ons: s.addOns,
			quoted_price: computeQuote({ windows, stories: s.layout.floors, service: s.service, addons: s.addOns }).total,
			preferred_date: addDaysIso(today, s.day),
			preferred_window: s.window,
			name: s.name,
			phone: s.noPhone ? '' : `(410) 555-01${String(10 + i * 7).padStart(2, '0')}`,
			email: `${first || 'homeowner'}@example.com`,
			notes: s.notes ?? '',
			status: s.status
		};
	}).sort((a, b) => b.created_at.localeCompare(a.created_at));
}
