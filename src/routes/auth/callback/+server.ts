import { env } from '$env/dynamic/private';
import { error, redirect } from '@sveltejs/kit';
import { OAuth2Client } from 'google-auth-library';
import { SESSION_COOKIE, SESSION_HOURS, isAllowedAdmin, makeSession } from '$lib/server/session';
import type { RequestHandler } from './$types';

// Finishes Google sign-in: checks state, trades the code (with the PKCE verifier) for an ID token, verifies
// it, and lets in only verified addresses listed in ADMIN_EMAILS.
export const GET: RequestHandler = async ({ url, cookies }) => {
	if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.SESSION_SECRET) error(404, 'Not found');
	const saved = JSON.parse(cookies.get('lp_oauth') ?? '{}') as { state?: string; nonce?: string; verifier?: string; next?: string };
	cookies.delete('lp_oauth', { path: '/auth' });
	const code = url.searchParams.get('code');
	if (!code || !saved.state || url.searchParams.get('state') !== saved.state) error(400, 'Sign-in expired. Please try again.');

	const client = new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, `${url.origin}/auth/callback`);
	const { tokens } = await client.getToken({ code, codeVerifier: saved.verifier });
	if (!tokens.id_token) error(400, 'Google did not return an identity. Please try again.');
	const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
	const claims = ticket.getPayload();
	if (!claims?.email || !claims.email_verified || claims.nonce !== saved.nonce) error(403, 'Could not verify that Google account.');
	if (!isAllowedAdmin(claims.email, env.ADMIN_EMAILS)) error(403, `${claims.email} isn’t allowed to use the owner page.`);

	cookies.set(SESSION_COOKIE, makeSession(claims.email, env.SESSION_SECRET), {
		path: '/',
		httpOnly: true,
		secure: url.protocol === 'https:',
		sameSite: 'lax',
		maxAge: SESSION_HOURS * 3600
	});
	redirect(303, saved.next ?? '/admin');
};
