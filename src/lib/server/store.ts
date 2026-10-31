import { env } from '$env/dynamic/private';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Firestore } from '@google-cloud/firestore';
import type { AddOnKey, ServiceType, Stories, TimeWindow } from '$lib/config';

export type RequestStatus = 'new' | 'confirmed' | 'done' | 'cancelled';
export const requestStatuses: RequestStatus[] = ['new', 'confirmed', 'done', 'cancelled'];

/** One document in the `quote_requests` collection (see the prototype spec's Data section). */
export type QuoteRequest = {
	id: string;
	created_at: string; // ISO timestamp
	address: string;
	zip: string;
	stories: Stories;
	window_count: number;
	service_type: ServiceType;
	add_ons: AddOnKey[];
	quoted_price: number; // USD, stored at request time
	preferred_date: string; // YYYY-MM-DD
	preferred_window: TimeWindow;
	name: string;
	phone: string;
	email: string;
	notes: string;
	status: RequestStatus;
	/**
	 * SHA-256 of the secret in the customer's "manage your booking" link. The link itself is only ever emailed
	 * and shown once; with just the database, nobody can open a booking. Missing on older requests.
	 */
	manage_hash?: string;
	/** Set when the customer reschedules or cancels from their link. */
	updated_at?: string;
	/** The booking's event on the owner's Google Calendar, when calendar sync is on. */
	calendar_event_id?: string;
};

export type NewQuoteRequest = Omit<QuoteRequest, 'id' | 'created_at' | 'status'>;

const COLLECTION = 'quote_requests';

interface Store {
	save(r: QuoteRequest): Promise<void>;
	get(id: string): Promise<QuoteRequest | null>;
	list(limit: number): Promise<QuoteRequest[]>;
	setStatus(id: string, status: RequestStatus): Promise<void>;
	update(id: string, fields: Partial<QuoteRequest>): Promise<void>;
	findByManageHash(hash: string): Promise<QuoteRequest | null>;
}

// ---------- Firestore (Cloud Run) ----------

let firestore: Firestore | null = null;
async function db(): Promise<Firestore> {
	if (!firestore) {
		const { Firestore } = await import('@google-cloud/firestore');
		// On Cloud Run the project and credentials come from the environment automatically.
		// FIRESTORE_DATABASE picks a named database (staging uses "staging"); unset means "(default)".
		firestore = new Firestore({
			...(env.GOOGLE_CLOUD_PROJECT && { projectId: env.GOOGLE_CLOUD_PROJECT }),
			...(env.FIRESTORE_DATABASE && { databaseId: env.FIRESTORE_DATABASE })
		});
	}
	return firestore;
}

const firestoreStore: Store = {
	async save(r) {
		await (await db()).collection(COLLECTION).doc(r.id).set(r);
	},
	async get(id) {
		const snap = await (await db()).collection(COLLECTION).doc(id).get();
		return snap.exists ? (snap.data() as QuoteRequest) : null;
	},
	async list(limit) {
		const snap = await (await db())
			.collection(COLLECTION)
			.orderBy('created_at', 'desc')
			.limit(limit)
			.get();
		return snap.docs.map((d) => d.data() as QuoteRequest);
	},
	async setStatus(id, status) {
		await (await db()).collection(COLLECTION).doc(id).update({ status });
	},
	async update(id, fields) {
		await (await db()).collection(COLLECTION).doc(id).update(fields);
	},
	async findByManageHash(hash) {
		const snap = await (await db()).collection(COLLECTION).where('manage_hash', '==', hash).limit(1).get();
		return snap.empty ? null : (snap.docs[0].data() as QuoteRequest);
	}
};

// ---------- Local JSON file (development only) ----------

const FILE = path.resolve('.data', 'requests.json');

async function readAll(): Promise<QuoteRequest[]> {
	try {
		return JSON.parse(await readFile(FILE, 'utf8')) as QuoteRequest[];
	} catch {
		return [];
	}
}

async function writeAll(rows: QuoteRequest[]) {
	await mkdir(path.dirname(FILE), { recursive: true });
	await writeFile(FILE, JSON.stringify(rows, null, 2));
}

const fileStore: Store = {
	async save(r) {
		const rows = await readAll();
		rows.push(r);
		await writeAll(rows);
	},
	async get(id) {
		return (await readAll()).find((r) => r.id === id) ?? null;
	},
	async list(limit) {
		return (await readAll())
			.sort((a, b) => b.created_at.localeCompare(a.created_at))
			.slice(0, limit);
	},
	async setStatus(id, status) {
		await this.update(id, { status });
	},
	async update(id, fields) {
		const rows = await readAll();
		const row = rows.find((r) => r.id === id);
		if (row) {
			Object.assign(row, fields);
			await writeAll(rows);
		}
	},
	async findByManageHash(hash) {
		return (await readAll()).find((r) => r.manage_hash === hash) ?? null;
	}
};

const store = (): Store => (env.STORAGE === 'firestore' ? firestoreStore : fileStore);

// ---------- Public API ----------

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Saves a new request. Returns it with the one-time secret for its "manage your booking" link. */
export async function saveRequest(input: NewQuoteRequest): Promise<{ record: QuoteRequest; manageToken: string }> {
	const manageToken = randomBytes(24).toString('base64url');
	const record: QuoteRequest = {
		...input,
		id: randomUUID(),
		created_at: new Date().toISOString(),
		status: 'new',
		manage_hash: hashToken(manageToken)
	};
	await store().save(record);
	return { record, manageToken };
}

/** The request a "manage your booking" link points to, or null for a wrong or malformed link. */
export async function getRequestByManageToken(token: string): Promise<QuoteRequest | null> {
	if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return null;
	return store().findByManageHash(hashToken(token));
}

export async function updateRequest(id: string, fields: Partial<QuoteRequest>): Promise<void> {
	await store().update(id, { ...fields, updated_at: new Date().toISOString() });
}

export const getRequest = (id: string) => store().get(id);
export const listRequests = (limit = 200) => store().list(limit);
export const setRequestStatus = (id: string, status: RequestStatus) => store().setStatus(id, status);
