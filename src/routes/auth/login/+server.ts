import { env } from '$env/dynamic/private';
import { error, redirect } from '@sveltejs/kit';
import { createHash, randomBytes } from 'node:crypto';
import type { RequestHandler } from './$types';

// Starts Google sign-in for /admin (OpenID Connect, authorization code with PKCE). The state, nonce and
// PKCE verifier ride along in a short-lived HttpOnly cookie and are checked in /auth/callback.
export const GET: RequestHandler = ({ url, cookies }) => {
	if (!env.GOOGLE_CLIENT_ID) error(404, 'Not found');
	const state = randomBytes(16).toString('base64url');
	const nonce = randomBytes(16).toString('base64url');
	const verifier = randomBytes(32).toString('base64url');
	const next = url.searchParams.get('next')?.startsWith('/admin') ? url.searchParams.get('next')! : '/admin';
	cookies.set('lp_oauth', JSON.stringify({ state, nonce, verifier, next }), {
		path: '/auth',
		httpOnly: true,
		secure: url.protocol === 'https:',
		sameSite: 'lax',
		maxAge: 600
	});

	const domain = (env.ADMIN_EMAILS ?? '').split(',')[0]?.split('@')[1]?.trim();
	const google = new URL('https://accounts.google.com/o/oauth2/v2/auth');
	google.search = new URLSearchParams({
		client_id: env.GOOGLE_CLIENT_ID,
		redirect_uri: `${url.origin}/auth/callback`,
		response_type: 'code',
		scope: 'openid email',
		state,
		nonce,
		code_challenge: createHash('sha256').update(verifier).digest('base64url'),
		code_challenge_method: 'S256',
		prompt: 'select_account',
		...(domain ? { hd: domain } : {})
	}).toString();
	redirect(303, google.toString());
};
