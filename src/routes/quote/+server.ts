import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// The quote now happens on the home page; keep old /quote links working.
export const GET: RequestHandler = () => redirect(308, '/');
