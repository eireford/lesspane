import {
	business,
	pricing,
	serviceAreaZips,
	type AddOnKey,
	type ServiceType,
	type Stories,
	type TimeWindow
} from './config';

type Source = URLSearchParams | FormData;
export type FieldErrors = Record<string, string>;
export type Result<T, R> = { ok: true; value: T } | { ok: false; errors: FieldErrors; raw: R };

const str = (src: Source, key: string) => String(src.get(key) ?? '').trim();
const strs = (src: Source, key: string) => src.getAll(key).map((v) => String(v).trim());

// ---------- Home details (screens 2–3) ----------

export type HomeDetails = {
	address: string;
	zip: string;
	stories: Stories;
	windows: number;
	service: ServiceType;
	addons: AddOnKey[];
};

export type RawHome = {
	address: string;
	zip: string;
	stories: string;
	windows: string;
	service: string;
	addons: string[];
};

export function readRawHome(src: Source): RawHome {
	return {
		address: str(src, 'address'),
		zip: str(src, 'zip'),
		stories: str(src, 'stories'),
		windows: str(src, 'windows'),
		service: str(src, 'service'),
		addons: strs(src, 'addons')
	};
}

/** The job itself, as the quote page's controls set it: everything needed to price it. */
export type Job = Omit<HomeDetails, 'address' | 'zip'>;

export function parseJob(src: Source): Result<Job, RawHome> {
	const raw = readRawHome(src);
	const errors: FieldErrors = {};

	const stories = Number(raw.stories);
	if (![1, 2, 3].includes(stories)) errors.stories = 'Choose how many stories.';

	const windows = Number(raw.windows);
	if (!Number.isInteger(windows) || windows < 1 || windows > pricing.maxWindows) {
		errors.windows = `Enter a whole number from 1 to ${pricing.maxWindows}.`;
	}

	if (raw.service !== 'exterior' && raw.service !== 'interior_exterior') {
		errors.service = 'Choose a service type.';
	}

	const validAddOns = Object.keys(pricing.addOns);
	const addons = [...new Set(raw.addons)];
	if (addons.some((a) => !validAddOns.includes(a))) errors.addons = 'Unknown add-on selected.';

	if (Object.keys(errors).length) return { ok: false, errors, raw };
	return {
		ok: true,
		value: { stories: stories as Stories, windows, service: raw.service as ServiceType, addons: addons as AddOnKey[] }
	};
}

export function parseHomeDetails(src: Source): Result<HomeDetails, RawHome> {
	const raw = readRawHome(src);
	const job = parseJob(src);
	const errors: FieldErrors = job.ok ? {} : { ...job.errors };

	if (raw.address.length < 5 || raw.address.length > 200) {
		errors.address = 'Enter the street address for the service.';
	}

	if (!/^\d{5}$/.test(raw.zip)) {
		errors.zip = 'Enter a 5-digit ZIP code.';
	} else if (!serviceAreaZips.has(raw.zip)) {
		errors.zip = "Sorry, we don't serve that ZIP code yet.";
	}

	if (!job.ok || Object.keys(errors).length) return { ok: false, errors, raw };
	return { ok: true, value: { address: raw.address, zip: raw.zip, ...job.value } };
}

// ---------- Time and contact (screen 4) ----------

export type ContactDetails = {
	preferredDate: string;
	preferredWindow: TimeWindow;
	name: string;
	phone: string;
	email: string;
	notes: string;
};

export type RawContact = Record<keyof ContactDetails, string>;

/** Today's date (YYYY-MM-DD) in the business time zone. */
export function todayIso(timeZone = business.timeZone, now = new Date()): string {
	// en-CA formats as YYYY-MM-DD.
	return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}

export function addDaysIso(iso: string, days: number): string {
	const [y, m, d] = iso.split('-').map(Number);
	const date = new Date(Date.UTC(y, m - 1, d + days));
	return date.toISOString().slice(0, 10);
}

export function bookingDateRange(now = new Date()) {
	const today = todayIso(business.timeZone, now);
	return {
		min: addDaysIso(today, business.bookingWindowDays.min),
		max: addDaysIso(today, business.bookingWindowDays.max)
	};
}

export function parseContact(src: Source, now = new Date()): Result<ContactDetails, RawContact> {
	const raw: RawContact = {
		preferredDate: str(src, 'preferredDate'),
		preferredWindow: str(src, 'preferredWindow'),
		name: str(src, 'name'),
		phone: str(src, 'phone'),
		email: str(src, 'email'),
		notes: str(src, 'notes')
	};
	const errors: FieldErrors = {};
	const { min, max } = bookingDateRange(now);

	if (!/^\d{4}-\d{2}-\d{2}$/.test(raw.preferredDate)) {
		errors.preferredDate = 'Pick a preferred day.';
	} else if (raw.preferredDate < min || raw.preferredDate > max) {
		errors.preferredDate = 'Pick a day between tomorrow and two months from now.';
	}

	if (raw.preferredWindow !== 'morning' && raw.preferredWindow !== 'afternoon') {
		errors.preferredWindow = 'Choose morning or afternoon.';
	}

	if (raw.name.length < 2 || raw.name.length > 80) errors.name = 'Enter your name.';

	const digits = raw.phone.replace(/\D/g, '');
	if (digits.length < 10 || digits.length > 15) errors.phone = 'Enter a phone number we can text.';

	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.email) || raw.email.length > 200) {
		errors.email = 'Enter a valid email address.';
	}

	if (raw.notes.length > 500) errors.notes = 'Keep notes under 500 characters.';

	if (Object.keys(errors).length) return { ok: false, errors, raw };

	return {
		ok: true,
		value: {
			preferredDate: raw.preferredDate,
			preferredWindow: raw.preferredWindow as TimeWindow,
			name: raw.name,
			phone: raw.phone,
			email: raw.email.toLowerCase(),
			notes: raw.notes
		}
	};
}
