import { business } from '#lib/config.ts';
import { agentTools } from '#lib/server/agent-api.ts';
import type { PageServerLoad } from './$types';

// The live AI agents demo. The tool list comes from the same definitions as /mcp and /api/v1.
export const load: PageServerLoad = ({ url }) => ({
	origin: url.origin,
	tools: agentTools.map(({ name, title, description, readOnly, http }) => ({ name, title, description, readOnly, http })),
	demo: business.showcase.enabled,
	links: {
		source: business.showcase.sourceUrl,
		plan: `${business.showcase.sourceUrl}/blob/main/docs/agent-ordering-plan.md`,
		evals: business.showcase.evalsUrl,
		agentSuite: `${business.showcase.evalsUrl}/blob/main/suites/lesspane-agent.yaml`,
		builtBy: business.showcase.builtBy,
		builtByUrl: business.showcase.builtByUrl,
		practice: business.showcase.practice
	}
});
