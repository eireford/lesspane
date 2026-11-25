import * as env from '$app/env/private';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Firestore } from '@google-cloud/firestore';
import type { AddOnKey, ServiceType, Stories, TimeWindow } from '#lib/config.ts';

/**
 * `awaiting_customer`: an AI agent asked for this visit and the customer hasn't confirmed it from their email yet
 * (docs/agent-ordering-plan.md). It takes no calendar slot and expires. Everything else starts at `new`.
 */
export type RequestStatus = 'awaiting_customer' | 'new' | 'confirmed' | 'done' | 'cancelled';
/** The statuses the owner can set. `awaiting_customer` is only ever set by an agent's request. */
export const requestStatuses: Exclude<RequestStatus, 'awaiting_customer'>[] = ['new', 'confirmed', 'done', 'cancelled'];

/** Where a request came from: the booking page, the site's chat assistant, or an outside AI agent. */
export type RequestSource = 'web' | 'chat' | 'agent';

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
	/** Missing on requests made before sources were recorded (all of them from the booking page or chat). */
	source?: RequestSource;
	/** For agent requests: the agent's own name for itself ("Claude, Anthropic"), as sent. Never trusted. */
	agent_name?: string;
	/** For agent requests: the client's User-Agent or MCP client name, for the owner and for abuse checks. */
	agent_client?: string;
	/** SHA-256 of the secret in the customer's confirm link (agent requests only; emailed, never given to the agent). */
	confirm_hash?: string;
	/** The agent's idempotency key, so a retried request returns the same booking. */
	idempotency_key?: string;
	/** SHA-256 of the quote id the agent booked with: a retry must bring the same one (agents' keys are guessable). */
	quote_hash?: string;
	/** When the owner phoned the customer to check an agent's request. */
	phone_checked_at?: string;
	/** Why a request was cancelled, when it wasn't the owner: `expired`, `declined` (the customer said it wasn't them). */
	cancel_reason?: string;
};

export type NewQuoteRequest = Omit<QuoteRequest, 'id' | 'created_at' | 'status' | 'manage_hash'> & { status?: RequestStatus };

/** Fields a request can be looked up by: secrets' hashes, an idempotency key, the customer's email. */
export type LookupField = 'manage_hash' | 'confirm_hash' | 'idempotency_key' | 'email';

const COLLECTION = 'quote_requests';

interface Store {
	save(r: QuoteRequest): Promise<void>;
	get(id: string): Promise<QuoteRequest | null>;
	list(limit: number): Promise<QuoteRequest[]>;
	setStatus(id: string, status: RequestStatus): Promise<void>;
	update(id: string, fields: Partial<QuoteRequest>): Promise<void>;
	findBy(field: LookupField, value: string, limit: number): Promise<QuoteRequest[]>;
}

// ---------- Firestore (Cloud Run) ----------

let firestore: Firestore | null = null;
/** The app's Firestore client, shared with the screenshot test's storage (screenshots/runs.ts). */
export async function db(): Promise<Firestore> {
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

/** Firestore rejects `undefined` values; optional fields that aren't set are left out instead. */
const defined = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

const firestoreStore: Store = {
	async save(r) {
		await (await db()).collection(COLLECTION).doc(r.id).set(defined(r));
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
		await (await db()).collection(COLLECTION).doc(id).update(defined(fields));
	},
	async findBy(field, value, limit) {
		const snap = await (await db()).collection(COLLECTION).where(field, '==', value).limit(limit).get();
		return snap.docs.map((d) => d.data() as QuoteRequest);
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
	async findBy(field, value, limit) {
		return (await readAll()).filter((r) => r[field] === value).slice(0, limit);
	}
};

const store = (): Store => (env.STORAGE === 'firestore' ? firestoreStore : fileStore);

// ---------- Public API ----------

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** A new private-link secret: 24 random bytes, 32 URL-safe characters. */
export const newToken = () => randomBytes(24).toString('base64url');

const TOKEN = /^[A-Za-z0-9_-]{32}$/;

/**
 * Saves a new request. Returns it with the one-time secret for its "manage your booking" link. A caller can pass
 * its own `manageToken` and `id` (agent requests derive both, so a retried request gets the same link back).
 */
export async function saveRequest(
	input: NewQuoteRequest,
	opts: { manageToken?: string; id?: string } = {}
): Promise<{ record: QuoteRequest; manageToken: string }> {
	const manageToken = opts.manageToken ?? newToken();
	const record: QuoteRequest = {
		...input,
		id: opts.id ?? randomUUID(),
		created_at: new Date().toISOString(),
		status: input.status ?? 'new',
		manage_hash: hashToken(manageToken)
	};
	await store().save(record);
	return { record, manageToken };
}

/** The request a "manage your booking" link points to, or null for a wrong or malformed link. */
export async function getRequestByManageToken(token: string): Promise<QuoteRequest | null> {
	if (!TOKEN.test(token)) return null;
	return (await store().findBy('manage_hash', hashToken(token), 1))[0] ?? null;
}

/** The agent request a customer's confirm link points to, or null. */
export async function getRequestByConfirmToken(token: string): Promise<QuoteRequest | null> {
	if (!TOKEN.test(token)) return null;
	return (await store().findBy('confirm_hash', hashToken(token), 1))[0] ?? null;
}

/** Agent requests saved with this idempotency key (models reuse readable keys, so there can be several). */
export const listRequestsByIdempotencyKey = (key: string) => store().findBy('idempotency_key', key, 20);

/** Requests from this email address (at most `limit`, in no particular order). */
export const listRequestsByEmail = (email: string, limit = 50) => store().findBy('email', email, limit);

export async function updateRequest(id: string, fields: Partial<QuoteRequest>): Promise<void> {
	await store().update(id, { ...fields, updated_at: new Date().toISOString() });
}

export const getRequest = (id: string) => store().get(id);
export const listRequests = (limit = 200) => store().list(limit);
export const setRequestStatus = (id: string, status: RequestStatus) => store().setStatus(id, status);
