import { env } from '$env/dynamic/private';
import { randomUUID } from 'node:crypto';
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
};

export type NewQuoteRequest = Omit<QuoteRequest, 'id' | 'created_at' | 'status'>;

const COLLECTION = 'quote_requests';

interface Store {
	save(r: QuoteRequest): Promise<void>;
	get(id: string): Promise<QuoteRequest | null>;
	list(limit: number): Promise<QuoteRequest[]>;
	setStatus(id: string, status: RequestStatus): Promise<void>;
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
		const rows = await readAll();
		const row = rows.find((r) => r.id === id);
		if (row) {
			row.status = status;
			await writeAll(rows);
		}
	}
};

const store = (): Store => (env.STORAGE === 'firestore' ? firestoreStore : fileStore);

// ---------- Public API ----------

export async function saveRequest(input: NewQuoteRequest): Promise<QuoteRequest> {
	const record: QuoteRequest = {
		...input,
		id: randomUUID(),
		created_at: new Date().toISOString(),
		status: 'new'
	};
	await store().save(record);
	return record;
}

export const getRequest = (id: string) => store().get(id);
export const listRequests = (limit = 200) => store().list(limit);
export const setRequestStatus = (id: string, status: RequestStatus) => store().setStatus(id, status);
