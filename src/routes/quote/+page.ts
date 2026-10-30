import { parseHomeDetails, readRawHome, type FieldErrors } from '$lib/validation';
import type { PageLoad } from './$types';

// Screen 2: "Your home". Prefills from the query string so "Edit details" keeps answers.
export const load: PageLoad = ({ url }) => {
	const raw = readRawHome(url.searchParams);
	let errors: FieldErrors = {};
	if (url.searchParams.has('err')) {
		const result = parseHomeDetails(url.searchParams);
		if (!result.ok) errors = result.errors;
	}
	return { raw, errors };
};
