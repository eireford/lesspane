// All business settings in one place. Change numbers here, not in components.
//
// ESTIMATES: prices below are set from published 2026 market rates (national $4–8 per pane /
// $10–15 per window inside + out; Vancouver, WA average job $232–309). Confirm against two or
// three local competitor quotes before the pilot (see "Open questions" in the prototype spec).

export const business = {
	name: 'LessPane',
	timeZone: 'America/Los_Angeles',
	/** How far ahead customers can request a date. */
	bookingWindowDays: { min: 1, max: 60 }
};

export type ServiceType = 'exterior' | 'interior_exterior';
export type AddOnKey = 'screens' | 'tracks' | 'hard_water';
export type Stories = 1 | 2 | 3;
export type TimeWindow = 'morning' | 'afternoon';

/** An add-on is charged once per window or once per visit. */
export type AddOn = { label: string; price: number; per: 'window' | 'visit' };

export const pricing = {
	/** Base price per window, outside only, single story, USD. ESTIMATE */
	perWindow: 7,
	/** Upper floors need ladders: roughly +$1–2.50 per window per floor. ESTIMATE */
	storyFactor: { 1: 1.0, 2: 1.15, 3: 1.4 } as Record<Stories, number>,
	/** Inside + outside ≈ $12 per window at the base rate. ESTIMATE */
	serviceFactor: { exterior: 1.0, interior_exterior: 1.7 } as Record<ServiceType, number>,
	/** Add-on prices, USD. ESTIMATE (market: screens $1–5, tracks $2–5, hard water $10–30 per window) */
	addOns: {
		screens: { label: 'Screen cleaning', price: 3, per: 'window' },
		tracks: { label: 'Track and sill cleaning', price: 4, per: 'window' },
		hard_water: { label: 'Hard-water stain removal', price: 10, per: 'window' }
	} as Record<AddOnKey, AddOn>,
	/** Smallest job you'll take, USD. ESTIMATE (small homes run $120–200) */
	minimum: 150,
	/** Final price is rounded to the nearest multiple of this. */
	roundTo: 5,
	maxWindows: 200
};

export const serviceLabels: Record<ServiceType, string> = {
	exterior: 'Outside only',
	interior_exterior: 'Inside + outside'
};

export const timeWindowLabels: Record<TimeWindow, string> = {
	morning: 'Morning (8am–12pm)',
	afternoon: 'Afternoon (12pm–5pm)'
};

// Launch service area by ZIP code. PLACEHOLDER: confirm the list before the pilot.
export const serviceAreaZips = new Set([
	'98660',
	'98661',
	'98662',
	'98663',
	'98664',
	'98665',
	'98682',
	'98683',
	'98684',
	'98685',
	'98686'
]);
