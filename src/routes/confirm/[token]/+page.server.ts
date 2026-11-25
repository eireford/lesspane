import { error } from '@sveltejs/kit';
import { firstName, place } from '#lib/contact.ts';
import { derivedManageToken } from '#lib/server/agent-secrets.ts';
import { confirmByCustomer, declineByCustomer, findForConfirmation } from '#lib/server/orders.ts';
import type { QuoteRequest } from '#lib/server/store.ts';
import type { Actions, PageServerLoad } from './$types';

// The customer's answer to an AI agent's request (the link in the "Please confirm" email). Opening the page
// changes nothing: email scanners open links, so confirming and declining are buttons that post.

function summary(r: QuoteRequest) {
	return {
		firstName: firstName(r),
		agent: r.agent_name || 'your assistant',
		address: place(r),
		date: r.preferred_date,
		window: r.preferred_window,
		total: r.quoted_price,
		windows: r.window_count,
		stories: r.stories,
		service: r.service_type,
		addons: r.add_ons,
		status: r.status,
		reason: r.cancel_reason ?? '',
		// After confirming, the customer's own manage link (agent requests derive it from the request id).
		manageUrl: r.status === 'new' || r.status === 'confirmed' ? `/manage/${derivedManageToken(r.id)}` : null
	};
}

const notFound: () => never = () => error(404, 'This link doesn’t match a request. Check the link in your email.');

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	setHeaders({ 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' });
	const r = await findForConfirmation(params.token);
	if (!r) notFound();
	return { request: summary(r) };
};

export const actions: Actions = {
	confirm: async ({ params, url }) => {
		const r = await confirmByCustomer(params.token, url.origin);
		if (!r) notFound();
		return { answered: 'confirmed' as const };
	},
	decline: async ({ params }) => {
		const r = await declineByCustomer(params.token);
		if (!r) notFound();
		return { answered: 'declined' as const };
	}
};
