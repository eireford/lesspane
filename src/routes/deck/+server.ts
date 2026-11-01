import { redirect } from '@sveltejs/kit';
import { business } from '$lib/config';
import type { RequestHandler } from './$types';

// lesspane.com/deck and lesspane.net/deck: a short address for the feature-tour slides. A temporary
// redirect, so pointing it at a new deck takes effect without browsers holding on to the old one.
export const GET: RequestHandler = () => redirect(302, business.deckUrl);
