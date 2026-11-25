import { agents, business, timeWindowLabels } from '#lib/config.ts';


// The content of the AI agents demo (/agents/demo): how an agent finds LessPane, how each AI maker's assistants
// connect to it, and the scripted conversations whose tool calls run live. Setup steps were checked against
// each maker's help pages in November 2026; menus get renamed, so every maker links its own current page.

// ---------- 1. Finding LessPane ----------

export type DiscoveryId = 'search' | 'llms' | 'agents' | 'openapi' | 'mcp' | 'website' | 'directories';

export type Discovery = {
	id: DiscoveryId;
	name: string;
	/** Who comes in this way. */
	who: string;
	/** What it finds there. */
	what: string;
	/** The resource on this site, if there is one to fetch live. */
	path?: string;
	live?: 'jsonld' | 'text' | 'openapi' | 'mcp';
};

export const discovery: Discovery[] = [
	{
		id: 'search',
		name: 'Search, and the home page',
		who: 'Any assistant that searches the web ("find me a window cleaner near Easton") and then reads the result.',
		what: 'The home page carries schema.org data: the kind of business, the nine counties, opening hours, package prices, and a pointer to the page for agents. Search engines read it too.',
		path: '/',
		live: 'jsonld'
	},
	{
		id: 'llms',
		name: '/llms.txt',
		who: 'Agents and tools that look for the llms.txt convention: a plain Markdown summary of a site, written for language models.',
		what: 'What LessPane does, where, the three ways in, the five steps of ordering, the packages with prices, and the rules. The same text as the /agents page.',
		path: '/llms.txt',
		live: 'text'
	},
	{
		id: 'agents',
		name: 'The /agents page',
		who: 'An assistant that browses the site, or a developer wiring one up. The home page data and llms.txt both point here.',
		what: 'The same guide as llms.txt, as a web page.',
		path: '/agents'
	},
	{
		id: 'openapi',
		name: 'OpenAPI',
		who: 'Platforms that call web APIs from a description: custom GPTs (Actions), Copilot Studio connectors, agent frameworks, or code.',
		what: 'Every operation as JSON over HTTPS, described in OpenAPI 3.1 and generated from the same tool definitions as the MCP server, so the two never disagree.',
		path: '/openapi.json',
		live: 'openapi'
	},
	{
		id: 'mcp',
		name: 'MCP server',
		who: 'Assistants that take a Model Context Protocol connector: Claude, ChatGPT (developer mode), Gemini CLI, Copilot Studio, Le Chat, VS Code and others. The person pastes the address once.',
		what: 'Seven tools with descriptions and input schemas, and instructions the server sends when an assistant connects. No sign-in: the customer confirms by email instead.',
		path: '/mcp',
		live: 'mcp'
	},
	{
		id: 'website',
		name: 'The website itself',
		who: 'Assistants that work a browser by looking and clicking, the "agent modes" several apps now have.',
		what: 'The quote is the same few questions a person answers, every step reachable by a tap or the keyboard (no swipe needed), with plain labels. No CAPTCHA in the way, and no account.'
	},
	{
		id: 'directories',
		name: 'Directories (next)',
		who: 'People browsing an assistant\'s list of apps, and agents that search MCP registries for a service.',
		what: 'Not listed yet. Listing in the MCP Registry and the makers\' app directories is the next phase of the plan, after people have tried the connector by hand.'
	}
];

// ---------- 2. Each AI maker's assistants ----------

export type Snippet = { title: string; lang: string; code: string };
export type Maker = {
	id: string;
	maker: string;
	assistant: string;
	/** What the assistant sends as `agent` when it books. */
	agentName: string;
	/** How a person connects LessPane in the maker's own app. */
	app: { name: string; steps: string[]; note?: string } | null;
	snippets: Snippet[];
	/** What has actually been tried, honestly. */
	checked: string;
	docs: { label: string; url: string }[];
};

export function makers(origin: string): Maker[] {
	const mcpUrl = `${origin}/mcp`;
	return [
		{
			id: 'anthropic',
			maker: 'Anthropic',
			assistant: 'Claude',
			agentName: 'Claude, Anthropic',
			app: {
				name: 'Claude (web, desktop and mobile)',
				steps: [
					'Open Settings, then Connectors, and choose Add custom connector.',
					`Name it LessPane and paste ${mcpUrl}. No sign-in details are needed.`,
					'In a chat, turn LessPane on from the tools menu and ask for a window cleaning.'
				],
				note: 'Free plans can add one custom connector. On Team and Enterprise plans an Owner adds it for everyone. Claude reaches the server from Anthropic\'s cloud, so it must be public, as this one is.'
			},
			snippets: [
				{ title: 'Claude Code', lang: 'bash', code: `claude mcp add --transport http lesspane ${mcpUrl}` },
				{
					title: 'Claude API (TypeScript): the MCP connector',
					lang: 'ts',
					code: `import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const reply = await client.beta.messages.create({
  model: "claude-opus-5-5",
  max_tokens: 16000,
  betas: ["mcp-client-2025-11-20"],
  mcp_servers: [{ type: "url", url: "${mcpUrl}", name: "lesspane" }],
  tools: [{ type: "mcp_toolset", mcp_server_name: "lesspane" }],
  messages: [{ role: "user", content: "What would LessPane charge for 24 windows on a two-story house?" }],
});`
				}
			],
			checked: 'Not yet tried by hand in the Claude apps. It uses the same MCP server the automated checks use.',
			docs: [
				{ label: 'Custom connectors (Claude Help Center)', url: 'https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp' },
				{ label: 'MCP connector (Claude API docs)', url: 'https://platform.claude.com/docs/en/agents-and-tools/mcp-connector' }
			]
		},
		{
			id: 'openai',
			maker: 'OpenAI',
			assistant: 'ChatGPT',
			agentName: 'ChatGPT, OpenAI',
			app: {
				name: 'ChatGPT, developer mode',
				steps: [
					'Open Settings, then Apps & Connectors, then Advanced settings, and turn on Developer mode.',
					`Create a new app (connector), name it LessPane, paste ${mcpUrl} and choose no authentication.`,
					'In a chat, add LessPane from the + menu and ask. ChatGPT asks you before it runs a tool that changes something, like a booking request.'
				],
				note: 'Paid plans only, and on business plans an admin turns developer mode on. OpenAI now calls connectors "apps", so the menus may read either way.'
			},
			snippets: [
				{
					title: 'A custom GPT: Actions from OpenAPI',
					lang: 'text',
					code: `Configure → Actions → Create new action → Import from URL:
${origin}/openapi.json
Authentication: None`
				},
				{
					title: 'OpenAI Responses API (JavaScript): the remote MCP tool',
					lang: 'js',
					code: `import OpenAI from "openai";

const openai = new OpenAI();
const response = await openai.responses.create({
  model: "YOUR_MODEL",
  tools: [{
    type: "mcp",
    server_label: "lesspane",
    server_url: "${mcpUrl}",
    require_approval: "always", // you approve each call, booking included
  }],
  input: "What would LessPane charge for 24 windows on a two-story house?",
});`
				}
			],
			checked: 'Not yet tried by hand in ChatGPT. It uses the same MCP server the automated checks use.',
			docs: [
				{ label: 'Developer mode (OpenAI docs)', url: 'https://developers.openai.com/api/docs/guides/developer-mode' },
				{ label: 'Connectors and MCP servers (OpenAI API docs)', url: 'https://developers.openai.com/api/docs/guides/tools-connectors-mcp' }
			]
		},
		{
			id: 'google',
			maker: 'Google',
			assistant: 'Gemini',
			agentName: 'Gemini, Google',
			app: {
				name: 'The Gemini app',
				steps: [
					'Google has been adding custom MCP apps to the Gemini web app, not yet for every account or country.',
					`If you have it: Settings, then Connected apps, then Add a custom app, and paste ${mcpUrl}.`
				],
				note: 'Gemini Enterprise has its own route: an admin adds a custom MCP server for the organization.'
			},
			snippets: [
				{ title: 'Gemini CLI: ~/.gemini/settings.json', lang: 'json', code: JSON.stringify({ mcpServers: { lesspane: { httpUrl: mcpUrl } } }, null, 2) },
				{
					title: 'Gemini API (JavaScript): an MCP client as a tool',
					lang: 'js',
					code: `import { GoogleGenAI, mcpToTool } from "@google/genai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const lesspane = new Client({ name: "my-assistant", version: "1.0.0" });
await lesspane.connect(new StreamableHTTPClientTransport(new URL("${mcpUrl}")));

const ai = new GoogleGenAI({});
const result = await ai.models.generateContent({
  model: "gemini-3.5-flash",
  contents: "What would LessPane charge for 24 windows on a two-story house?",
  config: { tools: [mcpToTool(lesspane)] },
});`
				}
			],
			checked: 'Checked automatically: the eval suite runs Gemini (gemini-3.5-flash on Vertex AI) as a person\'s own assistant, ordering over MCP. Six checks, three runs each: it quotes with the tool, asks before booking, books once at the real price, refuses a ZIP outside the area and a price over budget.',
			docs: [
				{ label: 'Gemini Apps developer mode (Google)', url: 'https://developers.google.com/connected-apps/mcp' },
				{ label: 'Function calling and MCP (Gemini API docs)', url: 'https://ai.google.dev/gemini-api/docs/function-calling' },
				{ label: 'Gemini CLI', url: 'https://github.com/google-gemini/gemini-cli' }
			]
		},
		{
			id: 'microsoft',
			maker: 'Microsoft',
			assistant: 'Copilot',
			agentName: 'Copilot, Microsoft',
			app: {
				name: 'Copilot Studio (an agent for a business)',
				steps: [
					'Open your agent, then Tools, then Add a tool, and pick Model Context Protocol.',
					`Give the server URL ${mcpUrl} with no authentication. Copilot Studio connects and lists the seven tools.`,
					'Generative orchestration must be on for the agent to choose the tools itself.'
				]
			},
			snippets: [
				{
					title: 'GitHub Copilot in VS Code: .vscode/mcp.json (agent mode)',
					lang: 'json',
					code: JSON.stringify({ servers: { lesspane: { type: 'http', url: mcpUrl } } }, null, 2)
				}
			],
			checked: 'Not tried yet. It uses the same MCP server (Streamable HTTP, which Copilot Studio requires).',
			docs: [
				{ label: 'Connect an MCP server (Copilot Studio docs)', url: 'https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent' },
				{ label: 'MCP servers in VS Code', url: 'https://code.visualstudio.com/docs/copilot/customization/mcp-servers' }
			]
		},
		{
			id: 'mistral',
			maker: 'Mistral AI',
			assistant: 'Le Chat',
			agentName: 'Le Chat, Mistral AI',
			app: {
				name: 'Le Chat',
				steps: [
					'Open Connectors and choose Add connector, then the Custom MCP Connector tab.',
					`Name it lesspane (no spaces) and paste ${mcpUrl}, then Connect.`,
					'Turn it on in a chat and ask.'
				],
				note: 'On team plans an admin adds custom connectors; on personal plans you are the admin.'
			},
			snippets: [],
			checked: 'Not tried yet. It uses the same MCP server.',
			docs: [{ label: 'Configuring a custom connector (Mistral Help Center)', url: 'https://help.mistral.ai/en/articles/393572-configuring-a-custom-connector' }]
		},
		{
			id: 'any',
			maker: 'Anyone',
			assistant: 'Any MCP client',
			agentName: 'My assistant',
			app: null,
			snippets: [
				{ title: 'Look around with the MCP Inspector', lang: 'bash', code: `npx @modelcontextprotocol/inspector\n# Transport: Streamable HTTP · URL: ${mcpUrl}` },
				{
					title: 'The official MCP SDK (TypeScript)',
					lang: 'ts',
					code: `import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({ name: "my-assistant", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL("${mcpUrl}")));
const { tools } = await client.listTools();
const quote = await client.callTool({ name: "get_quote", arguments: { package: "family" } });`
				}
			],
			checked: 'Checked automatically: npm run smoke:agent uses the official MCP SDK to discover, quote, request, confirm as the customer and cancel.',
			docs: [{ label: 'Model Context Protocol', url: 'https://modelcontextprotocol.io' }]
		}
	];
}

// ---------- 3. Conversations ----------

export type Ctx = { origin: string; maker: Maker; results: Record<string, Record<string, any>> };

export type Step =
	| { kind: 'person'; text: (c: Ctx) => string }
	| { kind: 'assistant'; text: (c: Ctx) => string }
	| { kind: 'call'; key: string; tool: string; args: (c: Ctx) => Record<string, unknown>; live: true }
	| { kind: 'call'; key: string; tool: string; args: (c: Ctx) => Record<string, unknown>; live: false; example: (c: Ctx) => Record<string, unknown>; why: string }
	| { kind: 'approve'; text: (c: Ctx) => string }
	| { kind: 'email'; to: string; date: (c: Ctx) => string }
	| { kind: 'owner' };

export type Scenario = { id: string; name: string; blurb: string; steps: Step[] };

const demoNote = business.showcase.enabled ? ' (LessPane is a demo, so nobody will actually come.)' : '';

/** The next Tuesday at least three days away, as YYYY-MM-DD, so the booking scenario always has a valid day. */
export function nextTuesday(now = new Date()): string {
	const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 3));
	while (d.getUTCDay() !== 2) d.setUTCDate(d.getUTCDate() + 1);
	return d.toISOString().slice(0, 10);
}

export const dayText = (iso: string) =>
	new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });

const price = (c: Ctx, key: string) => (c.results[key]?.total_text as string) ?? '(no price)';

export const scenarios: Scenario[] = [
	{
		id: 'book',
		name: 'Book a visit',
		blurb: 'The whole order: area, price, a yes from the person, the request, and the customer confirming by email.',
		steps: [
			{ kind: 'person', text: () => 'Can you get my windows cleaned next Tuesday morning? Two-story house in Easton, ZIP 21601, about 24 windows, just the outside.' },
			{ kind: 'call', key: 'area', tool: 'check_service_area', args: () => ({ zip: '21601' }), live: true },
			{ kind: 'call', key: 'quote', tool: 'get_quote', args: () => ({ windows: 24, stories: 2, service: 'exterior' }), live: true },
			{
				kind: 'assistant',
				text: (c) =>
					`LessPane serves 21601. Outside only, 24 windows on two floors, comes to ${price(c, 'quote')}. I can ask them for ${dayText(nextTuesday())}, ${timeWindowLabels.morning.toLowerCase()}. Shall I send the request?${demoNote}`
			},
			{ kind: 'person', text: () => 'Yes, go ahead. Use sam@example.com.' },
			{ kind: 'approve', text: (c) => `${c.maker.assistant} may ask before running request_booking, because it changes something. You allow it.` },
			{
				kind: 'call',
				key: 'booking',
				tool: 'request_booking',
				live: false,
				why: 'Not sent from this page, because it would email a real address. This is the answer LessPane gives, built from the live quote above.',
				args: (c) => ({
					quote_id: c.results.quote?.quote_id ?? '(from get_quote)',
					preferred_date: nextTuesday(),
					preferred_weekday: 'Tuesday',
					preferred_window: 'morning',
					email: 'sam@example.com',
					zip: '21601',
					agent: c.maker.agentName,
					approved_by_customer: true,
					request_id: 'sam-windows-tuesday-7f3a9c'
				}),
				example: (c) => {
					const date = nextTuesday();
					return {
						booking_token: '(32 private characters)',
						status: 'awaiting_customer',
						status_text: 'Waiting for the customer to confirm from the email LessPane sent them.',
						confirm_by: new Date(Date.now() + agents.confirmHours * 3_600_000).toISOString(),
						preferred_date: date,
						day_text: dayText(date),
						preferred_window: 'morning',
						time_text: timeWindowLabels.morning,
						total: c.results.quote?.total ?? null,
						total_text: price(c, 'quote'),
						manage_url: `${c.origin}/manage/(the same private characters)`,
						can_change: true,
						repeated: false,
						next_step: `Tell your person: LessPane emailed sam@example.com; they must tap Confirm in that email within ${agents.confirmHours} hours, or the request lapses. Nothing is booked until then.`
					};
				}
			},
			{
				kind: 'assistant',
				text: () =>
					`Done. LessPane emailed sam@example.com: tap Confirm in that email within ${agents.confirmHours} hours, or the request lapses. Nothing is booked until you do. Then LessPane confirms the exact time, usually within one business day.`
			},
			{ kind: 'email', to: 'sam@example.com', date: () => nextTuesday() },
			{ kind: 'owner' }
		]
	},
	{
		id: 'price',
		name: 'Just a price',
		blurb: 'The person only asks. The assistant prices with the tool and books nothing.',
		steps: [
			{ kind: 'person', text: () => 'Roughly what would LessPane charge for a big three-floor house with lots of glass, inside and out?' },
			{ kind: 'call', key: 'quote', tool: 'get_quote', args: () => ({ package: 'large', service: 'interior_exterior' }), live: true },
			{
				kind: 'assistant',
				text: (c) =>
					`For a large three-floor home (about ${c.results.quote?.windows ?? 60} windows), inside and outside, LessPane's price is ${price(c, 'quote')}. That's their own quote, valid for ${agents.quoteValidDays} days. Want me to ask them for a day?`
			}
		]
	},
	{
		id: 'area',
		name: 'Outside the area',
		blurb: 'A ZIP LessPane doesn\'t serve. The assistant checks first and books nothing.',
		steps: [
			{ kind: 'person', text: () => 'Book a window cleaning at my place in Brooklyn, 11201, next Friday.' },
			{ kind: 'call', key: 'area', tool: 'check_service_area', args: () => ({ zip: '11201' }), live: true },
			{
				kind: 'assistant',
				text: (c) =>
					c.results.area?.served
						? 'LessPane serves 11201. Shall I get you a price?'
						: 'LessPane only cleans on Maryland\'s Eastern Shore, and 11201 isn\'t in its area, so I haven\'t booked anything. Want me to look for a window cleaner near you instead?'
			}
		]
	},
	{
		id: 'budget',
		name: 'Over budget',
		blurb: 'The real price is above the person\'s limit, so the assistant asks instead of booking.',
		steps: [
			{ kind: 'person', text: () => 'Get the outside windows of my cottage in Salisbury, 21801, cleaned this month, as long as it\'s under $100.' },
			{ kind: 'call', key: 'area', tool: 'check_service_area', args: () => ({ zip: '21801' }), live: true },
			{ kind: 'call', key: 'quote', tool: 'get_quote', args: () => ({ package: 'cottage' }), live: true },
			{
				kind: 'assistant',
				text: (c) =>
					(c.results.quote?.total ?? 0) > 100
						? `LessPane serves 21801, but its price for a cottage, outside only, is ${price(c, 'quote')}: over your $100 limit. I haven't asked for a booking. Go ahead anyway, or skip it?`
						: `LessPane serves 21801 and a cottage, outside only, is ${price(c, 'quote')}, under your limit. Which day suits you?`
			}
		]
	}
];

