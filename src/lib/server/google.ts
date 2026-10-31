import { GoogleAuth } from 'google-auth-library';

// Acting as a Google Workspace user (for Gmail and Calendar) with domain-wide delegation, and no key file.
// The Cloud Run service account asks the IAM Credentials API to sign a JWT naming the Workspace user as
// `sub`, then trades it for an access token. Setup (once): the service account needs Token Creator on
// itself, and a Workspace admin must allow its client ID for these scopes under Security → API controls →
// Domain-wide delegation. See README "Google Workspace".

export const SCOPES = {
	gmail: 'https://www.googleapis.com/auth/gmail.send',
	calendar: 'https://www.googleapis.com/auth/calendar.events'
} as const;

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
const cache = new Map<string, { token: string; expires: number }>();

async function serviceAccountEmail(): Promise<string> {
	const creds = await auth.getCredentials();
	if (!creds.client_email) throw new Error('No service account identity (only available on Cloud Run).');
	return creds.client_email;
}

/** An access token for `subject` (a Workspace user's primary address) limited to `scopes`. Cached ~50 min. */
export async function delegatedToken(subject: string, scopes: string[]): Promise<string> {
	const key = `${subject} ${scopes.join(' ')}`;
	const hit = cache.get(key);
	if (hit && hit.expires > Date.now()) return hit.token;

	const sa = await serviceAccountEmail();
	const now = Math.floor(Date.now() / 1000);
	const client = await auth.getClient();
	const signed = await client.request<{ signedJwt: string }>({
		url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(sa)}:signJwt`,
		method: 'POST',
		data: {
			payload: JSON.stringify({
				iss: sa,
				sub: subject,
				scope: scopes.join(' '),
				aud: 'https://oauth2.googleapis.com/token',
				iat: now,
				exp: now + 3600
			})
		}
	});

	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion: signed.data.signedJwt
		})
	});
	const body = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
	if (!res.ok || !body.access_token) {
		throw new Error(`Delegation for ${subject} failed: ${body.error} ${body.error_description ?? ''}`.trim());
	}
	cache.set(key, { token: body.access_token, expires: Date.now() + 50 * 60 * 1000 });
	return body.access_token;
}

/** Calls a Google REST API as the Workspace user. Throws with the API's message on failure. */
export async function googleFetch(subject: string, scope: string, url: string, init: RequestInit = {}) {
	const token = await delegatedToken(subject, [scope]);
	const res = await fetch(url, {
		...init,
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers }
	});
	if (!res.ok && res.status !== 404 && res.status !== 410) {
		throw new Error(`${init.method ?? 'GET'} ${url} → ${res.status} ${await res.text()}`);
	}
	return res;
}
