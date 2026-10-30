// All business settings in one place. Change numbers here, not in components.
//
// PLACEHOLDERS: every price below is a starting assumption for testing.
// Set real rates before the pilot (see "Open questions" in the prototype spec).

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

export const pricing = {
	/** Base price per window, USD. PLACEHOLDER */
	perWindow: 8,
	storyFactor: { 1: 1.0, 2: 1.2, 3: 1.5 } as Record<Stories, number>,
	serviceFactor: { exterior: 1.0, interior_exterior: 1.8 } as Record<ServiceType, number>,
	/** Flat add-on prices, USD. PLACEHOLDER */
	addOns: {
		screens: { label: 'Screen cleaning', price: 25 },
		tracks: { label: 'Track and sill cleaning', price: 30 },
		hard_water: { label: 'Hard-water stain removal', price: 60 }
	} as Record<AddOnKey, { label: string; price: number }>,
	/** Smallest job you'll take, USD. PLACEHOLDER */
	minimum: 120,
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
