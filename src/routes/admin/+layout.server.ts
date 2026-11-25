import type { LayoutServerLoad } from './$types';

// Owner-only (hooks.server.ts). The signed-in owner, for the sign-out line; null with the password.
export const load: LayoutServerLoad = ({ locals }) => ({ admin: locals.admin ?? null });
