import { agentGuide } from '#lib/agent-guide.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => ({ guide: agentGuide(url.origin) });
