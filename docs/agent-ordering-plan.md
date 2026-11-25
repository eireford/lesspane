# Plan: AI agents ordering a window cleaning on their own

Status (2026-11-25): **phases 0–2 built**, in demo mode; see "What was built" at the end. Phases 3–5 wait for
launch and for Eire's decisions (section 10). LessPane is still a demo, so every agent-facing answer says so, and
nothing here is listed in a public directory.

The goal: someone tells their AI assistant "get my windows cleaned next week". The assistant finds LessPane, gets
a real price, asks its person to approve, requests a visit, and can later check, move or cancel it. The owner gets
a request as trustworthy as one made on the website.

Two rules carry over from the site and the chat assistant, and nothing here relaxes them:

1. **Prices and bookings go through LessPane's own code.** `computeQuote`, the shared validators and `saveRequest`,
   exactly as `/book` and the chat tools (`src/lib/server/assistant/tools.ts`) use them. An agent never sends a
   price, and any price it sends is ignored.
2. **A person approves every booking.** An agent can *request* a visit. It becomes a job only after the customer
   confirms it themselves and the owner confirms the time.

---

## 1. Which agents will be asked, and how each one reaches a business

As of November 2026 there is no single way agents buy services. Each family below reaches a business differently,
so LessPane needs a few doors, all opening onto the same code.

| Family | Examples (Nov 2026) | How it reaches a business | What LessPane needs |
| --- | --- | --- | --- |
| **Search assistants that phone businesses** | Google Search: "call businesses on your behalf" for home repair and similar categories, announced at I/O 2026 | Picks businesses from local results (Business Profile), then **calls the phone number** | A Google Business Profile, a phone number that is answered (open item Q35), and good local listings |
| **Assistants with app or connector directories** | ChatGPT apps, Claude connectors and custom connectors, other MCP clients | Calls a **remote MCP server**, listed in a directory or added by the user | An MCP server at `lesspane.com/mcp` |
| **Marketplaces built into assistants** | Thumbtack in ChatGPT and Claude; Thumbtack, Angi and Yelp in Alexa+ | Searches the marketplace's pros, not the open web | A Thumbtack (and maybe Yelp or Angi) listing. These charge for leads, so it's a business decision |
| **Browser agents** | ChatGPT agent mode, Claude in Chrome, Gemini in Chrome, Perplexity Comet, Copilot | **Uses the website** like a person: reads pages, fills forms | A site that works without gestures and labels its fields clearly (it mostly does); later, WebMCP tools in Chrome (origin trial) |
| **Developer-built agents** | A property manager's agent, home-services aggregators, personal agents | Calls an **HTTP API** described by OpenAPI, or MCP | A small public API (the same operations as the MCP tools) |
| **Email agents** | Assistants that write to businesses | Sends email to the contact address | Nothing automatic. A person answers, as now |

**Where to start:** MCP plus a plain HTTP API covers the connector, developer and browser families with one piece of
work. The phone and marketplace families depend on business decisions (a phone line, paid listings), not code.

---

## 2. How an agent finds LessPane

In order of what moves the needle, cheapest first.

1. **Google Business Profile** (Eire): category "Window cleaning service", service area of the counties actually
   served, hours, phone, website, price range. Google's calling and booking agents pick from local results, so this
   matters most. Also Bing Places and Apple Business Connect.
2. **Structured data on the home page** (JSON-LD): `HomeAndConstructionBusiness` (a `LocalBusiness` type) with
   `areaServed` (the counties), `priceRange`, `openingHoursSpecification`, `makesOffer` (the three packages, with
   prices from `config.ts`, never typed by hand), and a `potentialAction` that points at `/quote`. Agents and
   search engines read this. It costs little, even though few agents act on `ReserveAction` today.
3. **A page written for agents:** `/agents` (HTML) and `/llms.txt` (plain text). They say what LessPane does, where,
   the rules (section 3) and how to order (MCP, API or the website), linking the OpenAPI file. Draft in Appendix A.
4. **Machine-readable doors at well-known paths:**
   - `/.well-known/mcp/server.json`, so the official MCP Registry can find and list the server. The registry is
     still "preview", and the Server Card path (`/.well-known/mcp/server-card`, SEP-2127) is still a proposal, so
     serve both from one source and recheck the paths when building.
   - `/openapi.json` for the HTTP API.
   - Leave out an A2A Agent Card for now. LessPane offers tools, not an agent of its own.
5. **robots.txt** keeps allowing search and assistant crawlers (it already does), with `/admin`, `/manage/` and
   `/owner` kept out.
6. **Directories, at launch only:** the MCP Registry, the ChatGPT app directory and the Claude connectors directory.
   Each has a review; while LessPane is a demo it stays unlisted (people can still add the server by URL to test).
7. **Marketplaces** (Thumbtack, Yelp, Angi): a business decision for Eire. They are the only way into Alexa+ today.

---

## 3. How an agent orders: the protocol

### The operations

The same six operations, offered as MCP tools and as a JSON HTTP API (`/api/v1/...`). Both call one shared module
(`src/lib/server/orders.ts`), which the chat assistant's tools should also move onto, so there is one code path.

| Operation | MCP tool | HTTP | What it does |
| --- | --- | --- | --- |
| About the business | `get_business_info` | `GET /api/v1/business` | Services, service area (counties and ZIPs), hours, policies (`policies` in `config.ts`), payment terms, demo flag |
| Check the address | `check_service_area` | `GET /api/v1/service-area?zip=21601` | Served or not |
| Price a job | `get_quote` | `POST /api/v1/quotes` | Floors, windows (or a package id, or sides × floors buckets as on `/quote`), service, extras → the price lines and a **quote id**, valid 14 days |
| Request a visit | `request_booking` | `POST /api/v1/bookings` | Quote id, preferred day and window, the customer's contact details, notes, and who the agent is → a booking in **awaiting customer**, plus a status link |
| Check a booking | `get_booking` | `GET /api/v1/bookings/{token}` | Status, day, price, what is still needed |
| Change or cancel | `reschedule_booking`, `cancel_booking` | `POST /api/v1/bookings/{token}/reschedule` and `/cancel` | The same rules as `/manage/<token>`: until the day before, free |

Availability: LessPane deliberately has no live calendar. An agent asks for a day and a morning or afternoon and
gets back "requested; the owner confirms within one business day". The tools say that plainly so the agent doesn't
promise its person a confirmed slot. A `get_availability` tool can come later, once the owner wants to publish
open days.

### The states of a booking

```
request_booking ──► awaiting_customer ──(customer clicks confirm)──► new ──(owner confirms)──► confirmed ──► done
                         │  (48 h, no click: expires)                 │                         │
                         └──────────────► cancelled ◄─────────────────┴─────────────────────────┘
```

`awaiting_customer` is the one new status. Bookings made on the website stay as they are (straight to `new`),
because the person is right there. The owner's list shows `awaiting_customer` requests dimmed, with no calendar
event, so an unconfirmed agent request never takes up the owner's time.

### What the agent must send with a booking

- **The customer's email** (required, as on the site), and the phone, name and address if the person shared them.
- **`agent`:** its product name and operator ("ChatGPT, OpenAI", "Claude, Anthropic", or a developer's own),
  free text. It is recorded and shown to the owner, never trusted on its own.
- **`approved_by_customer: true`**, meaning the person saw this price and day and said yes. The tool descriptions
  say to call `request_booking` only after that, as the chat assistant's do. It can't be proven, which is why the
  customer confirms by email anyway (section 4).
- **An `Idempotency-Key`** (HTTP) or `request_id` (MCP), so a retried call doesn't create two bookings.

### What the agent gets back

- A **status link** (`/manage/<token>`, the same private link the customer is emailed) and the token, so the agent
  can check, move or cancel later. Anyone holding it can change the booking, which is how the customer's own link
  already works. The agent gets it because it acts for the customer.
- `next_step: "The customer must confirm from the email we just sent to <email> within 48 hours."`
- `demo: true` and a plain sentence while showcase mode is on: "LessPane is a demo; nobody will come to clean."

### Example: a whole order through MCP

```
get_business_info()                       → Eastern Shore MD, outside or inside+outside, minimum $120, pay after the job
check_service_area(zip: "21601")          → served
get_quote(package: "family", service: "exterior")
                                          → $210, quote_id q_7Hc…, 24 windows, valid until 2026-12-08
   (the agent shows its person: "$210 for a two-story home, outside, Saturday morning?" The person says yes.)
request_booking(quote_id: "q_7Hc…", preferred_date: "2026-11-28", preferred_window: "morning",
                email: "pat@example.com", phone: "(410) 555-0100", address: "12 Goldsborough St", zip: "21601",
                agent: "Claude, Anthropic", approved_by_customer: true, request_id: "c1e9…")
                                          → awaiting_customer; status link; "Pat must confirm from the email"
   (Pat taps Confirm in the email → new → the owner gets the alert and a tentative calendar event)
get_booking(token)                        → confirmed for Saturday, morning
```

### Guardrails in the server, not in the agent

- The price always comes from `computeQuote` on the quote's stored inputs. The quote id is a signed, expiring
  reference, so an agent can't edit it and an old price can't be replayed after prices change. The booking is
  re-priced at request time; if the price differs, the call fails with the new quote.
- The same validation as `/book`: ZIP in the service area, a date 1 to 60 days ahead, a valid email, lengths.
- `notes` are stored and shown as plain text, never followed. The owner's alert labels them as written by an agent.
- Limits: 10 requests a minute per IP (as the chat), 3 open bookings per email, and 1 booking per address per
  week. Errors come back as clear JSON or MCP errors with a reason, not HTTP 200 with an apology (the rule across
  every site).
- No model runs on these endpoints. They are deterministic and cost almost nothing, unlike `/api/chat`.

---

## 4. Checking that an order is real

Three questions: is there a real person who wants this, is the agent who it says, and is it abuse? At first the
answer to the first is a **real phone call from a real person**: Eire.

### Phase 1: every agent booking is checked by hand

1. **The customer confirms by email.** The booking waits in `awaiting_customer` until the customer taps Confirm in
   an email that says which assistant made it ("Your assistant (Claude) asked us to clean your windows on Saturday
   morning for $210. Was this you?"), with **Confirm** and **This wasn't me** buttons. No click in 48 hours and it
   expires. "This wasn't me" cancels it and flags the email address.
2. **The owner calls before confirming.** For the first agent bookings, the owner's alert says "Booked by an AI
   agent (Claude). Call to check before confirming." The owner page shows a phone button and a **Checked by phone**
   box. The call takes a minute: confirm the address, the day, the price and that the person asked their assistant
   to book. This is also the best research there is on what agents get wrong.
3. **Eire tests every door himself first**, as a real customer on staging, before any agent stranger does (section
   8): his own ChatGPT, Claude and Gemini, a browser agent and a script, booking with his own email and phone.

### Phase 2: lighter, once it has earned it

After **20 agent bookings in a row that were checked by phone and were all real**, drop the call for bookings
where the customer confirmed by email. Keep calling when any of these holds: the agent's identity isn't verified,
the price is over $500, it is the customer's first booking with no phone number, or the address is new and the
notes look odd. Write the counts in `docs/` as they come, so the decision rests on numbers.

### Who the agent is

- **Record what's offered:** the `agent` field, the MCP client name and version, the User-Agent, and the IP.
- **Check signatures where they exist.** Web Bot Auth (HTTP Message Signatures, RFC 9421, with a `Signature-Agent`
  key directory) is an IETF working-group draft, and Cloudflare treats signed agents as verified. Adoption is
  uneven: some big agents sign, others publish IP ranges instead. So verify a signature when present and show
  "verified: <operator>" to the owner, but don't require one: a missing signature only means a phone check.
- **No customer accounts**, as on the site. The email confirmation is the identity check. If a platform later
  offers verified user identity (OAuth on the MCP server), it can replace the email step for that platform, never
  the owner's control.

### Abuse

- Rate limits and caps above; a per-email and per-address history the owner can see.
- Block lists for email, IP range and agent name, editable on the owner page.
- An alert to the owner when agent bookings in an hour pass a threshold (default 5).
- Spam can't hurt much by design: an unconfirmed booking costs the owner nothing, takes no calendar slot and
  expires.

---

## 5. How an agent pays

**Today the answer is that it doesn't need to**, and that is the strongest position to start from. LessPane takes
nothing up front: the customer pays after the job, by card, check, cash, Venmo or Zelle (`policies.payment`). An
agent only has to tell its person that.

| Phase | Payment | Why and when |
| --- | --- | --- |
| **Now** | Nothing online. `get_business_info` returns the payment terms so the agent can repeat them. | No processor, no fraud exposure, no refunds. Matches the website. |
| **Later: card guarantee** | After the customer confirms, an optional **Stripe Checkout link in setup mode** saves a card. The owner charges it from the owner page after the job, for the agreed price. | Protects against no-shows if they become a problem. Needs a Stripe account (Eire). The customer enters the card on Stripe, never through the agent. |
| **Later: agent-platform payment** | Accept **Stripe Shared Payment Tokens** from platforms that hold the person's card (ACP, now covering Visa Intelligent Commerce, Mastercard Agent Pay, Affirm and Klarna through Stripe). **AP2** mandates (v0.2, now at the FIDO Alliance) for Google's agents, when they cover services. | Only once a platform people actually use pays for services this way. In 2026 these flows are built for retail goods and hotels, and ChatGPT's Instant Checkout was scaled back in March 2026. |
| **Not a fit** | x402 and machine-payment protocols (stablecoins, pay per request) | Made for paying for API calls, not a $210 house call. |

Rules for any phase with money: charge only after the job (a card hold expires long before a visit 60 days out),
never more than the confirmed price unless the person agreed a change on site (the existing policy), receipts by
email, refunds and disputes handled by the owner on the owner page. Before any online payment, check whether
Maryland sales tax applies to residential window cleaning (likely not, but ask an accountant).

---

## 6. Policies, privacy and the demo

- **Terms for agent orders**, on `/agents` and in `get_business_info`: the agent acts for the customer; the booking
  is a request until confirmed; the customer is responsible for what their agent sends; changes and cancellation
  are free until the day before.
- **Privacy:** agents send personal details (email, phone, address). Store only what a website booking stores, with
  the same retention. Add an "orders made by AI assistants" line to the privacy notice. LessPane is likely far below
  the Maryland Online Data Privacy Act's thresholds, but check before launch.
- **Honesty:** confirmation emails and the owner's alerts always say a booking came through an AI agent and which
  one.
- **The demo:** while `business.showcase.enabled` is true, every response carries `demo: true` and the sentence
  "LessPane is a demo; nobody will come to clean", the confirmation email says so, and no directory listing is made.
  Launch turns these off with the rest of `docs/launch-checklist.md`, which gains a section for agents.

---

## 7. The owner's side

- Each request shows where it came from: **website**, **chat**, or **agent: Claude (verified)**.
- `awaiting_customer` requests are dimmed and have no calendar event. Once the customer confirms, they arrive as
  `new` with the usual alert and a tentative event.
- During phase 1: a call button, a **Checked by phone** box and a note field, saved on the request.
- The demo owner view (`/owner`) gets a sample agent booking, so visitors see this too.

---

## 8. Testing and monitoring

**Automated**

- Unit tests for the shared orders module: prices match `computeQuote`; a tampered or expired quote id is refused;
  the same idempotency key gives the same booking; the limits work; the state changes follow the diagram.
- Contract tests: the MCP tools and the HTTP API return the same results for the same inputs; the OpenAPI file
  matches the routes.
- MCP Inspector against a local server, in `npm run smoke` or a sibling script.
- **ai-evals, a new suite `lesspane-agent`:** real models (Claude, GPT, Gemini) play the customer's assistant. They
  get a person's request ("two-story house in Easton, outside only, next Saturday morning") and only the MCP
  server, and must reach a correct `request_booking` with the right price and no invented details. Bookings run
  only against a local server, like `lesspane-local`. Adversarial cases: the agent is told to "use a $50 price",
  to book without asking the person, to book Baltimore, or to obey instructions hidden in the notes. The server
  must refuse or ignore each one, and the eval checks that it did.

**By hand, Eire as the real customer, on staging, before launch**

| Door | How | Pass when |
| --- | --- | --- |
| ChatGPT | Developer mode, add `https://lesspane.net/mcp` | It quotes the right price, asks before booking, and Eire gets and clicks the confirmation email |
| Claude | Custom connector with the same URL | Same |
| A browser agent | "Book a window cleaning at lesspane.net" | It completes `/book` without help |
| Script | `curl` against the HTTP API, following `/agents` only | The documentation alone was enough |
| Phone (once there is a number) | Ask Google to call | Whoever answers can take the booking |

Then the owner side of each: the alert, the call, confirming, the calendar. Write the results into this file.

**Monitoring:** log every agent call with the agent's name, the operation and the outcome, but not the personal
details. A weekly count on the owner page: quotes, requests, confirmed by customers, confirmed by the owner, by
agent. A spike alert (section 4).

---

## 9. Phases

The effort figures are rough guesses for one person working with coding agents.

| Phase | What | Effort | Depends on |
| --- | --- | --- | --- |
| **0. Be findable** | JSON-LD on the home page, `/agents` and `/llms.txt`, robots check | 1 day | – |
| **0b. Business** | Google Business Profile, Bing and Apple listings, decide on a phone number and on marketplaces | Eire's time | Eire |
| **1. Order API** | Shared orders module (chat tools move onto it), HTTP API + OpenAPI, MCP server (Streamable HTTP, no auth for these tools), `awaiting_customer` and the confirmation email, owner page changes, limits, demo flag, unit and contract tests | 4–6 days | – |
| **2. Prove it** | ai-evals `lesspane-agent` suite; Eire's tests with real agents on staging; phase-1 phone checks | 2 days + Eire's time | Phase 1 |
| **3. Launch to agents** | `/.well-known/mcp/server.json`, MCP Registry, ChatGPT app and Claude connector submissions, marketplace listings | 1–2 days + review time | LessPane leaving demo mode |
| **4. Lighter checks** | Drop the call per section 4; Web Bot Auth verification; the agent badge | 1–2 days | 20 checked bookings |
| **5. Payment** | Stripe card guarantee; then delegated tokens if a platform people use needs them | 2–4 days each | A Stripe account; demand |

Phases 0 and 1 are worth doing while LessPane is a demo: they make a strong portfolio piece ("an AI agent can book
this business, safely") and every response says it's a demo.

---

## 10. Decisions for Eire

1. **Build phases 0–2 now, in demo mode?** (Recommended: yes, as a showcase.)
2. **A phone number.** Google's agents phone businesses. Without a number LessPane misses that family entirely.
   Same open item as Q35 in `assistant-questions.md`.
3. **Marketplaces.** Thumbtack (and maybe Yelp or Angi) is the only way into Alexa+ and a strong way into
   ChatGPT and Claude, at the cost of lead fees.
4. **The phone-check rule.** Call every agent booking at first, and relax it after 20 good ones? Different numbers?
5. **The status token.** Is it fine for an agent to hold the customer's manage link? (Recommended: yes, it acts
   for them, and the customer can always cancel from their own email.)
6. **Stripe**, only if no-shows or payment platforms make it worth it.

---

## Appendix A. Draft of `/agents` (also served as `/llms.txt`)

> **LessPane: window cleaning on Maryland's Eastern Shore. Notes for AI agents.**
>
> LessPane cleans home windows, outside only or inside and outside, in Caroline, Cecil, Dorchester, Kent, Queen
> Anne's, Somerset, Talbot, Wicomico and Worcester counties, Maryland. Prices start at $120.
>
> You can order for the person you assist through **MCP** (`https://lesspane.com/mcp`, Streamable HTTP, no
> sign-in), the **HTTP API** (`https://lesspane.com/openapi.json`), or the website (`https://lesspane.com/quote`).
>
> How to order:
> 1. Check the ZIP with `check_service_area`.
> 2. Get a price with `get_quote`. Never state a price you did not get from it.
> 3. Show your person the price, the day (morning 8–12 or afternoon 12–5) and what's included, and ask them to
>    approve. Don't book without a clear yes.
> 4. Call `request_booking` with the quote id, the day, their email (required) and any phone, name and address they
>    gave. Say which assistant you are in `agent`.
> 5. Tell your person: they must confirm from the email LessPane sends, within 48 hours; then LessPane confirms the
>    exact time, usually within one business day. It's a request until then.
>
> Payment: nothing up front. The customer pays after the job by card, check, cash, Venmo or Zelle.
> Changes: free until the day before, with `reschedule_booking` or `cancel_booking`, or the link in the email.
> Not offered: gutters, solar panels, roof skylights, buildings over three stories, pressure washing, storefronts.
>
> **LessPane is currently a demo. Bookings are not real and nobody will come to clean.**

---

## Sources (checked 2026-11-24)

The field moves monthly; recheck each one when building.

- Google Search at I/O 2026, calling businesses for home repair and more:
  [blog.google](https://blog.google/products-and-platforms/products/search/search-io-2026/)
- Google AI Mode agentic booking: [blog.google](https://blog.google/products-and-platforms/products/search/ai-mode-agentic-personalized/)
- Universal Commerce Protocol: [developers.google.com/merchant/ucp](https://developers.google.com/merchant/ucp),
  [hotels](https://developers.google.com/hotels/ucp)
- ChatGPT Instant Checkout scaled back (March 2026):
  [TechCrunch](https://techcrunch.com/2026/03/24/openais-plans-to-make-chatgpt-more-like-amazon-arent-going-so-well/);
  ACP delegated payment spec: [developers.openai.com](https://developers.openai.com/commerce/specs/payment)
- Stripe Shared Payment Granted Token: [Stripe changelog](https://docs.stripe.com/changelog/dahlia/2026-04-22/shared-payment-granted-token)
- AP2 v0.2 and FIDO Alliance: [overview](https://eco.com/support/en/articles/15192002-ap2-protocol-explained-google-s-agentic-commerce-standard-2026)
  (secondary; check the AP2 repository)
- MCP discovery (`/.well-known/mcp/server.json`, Server Cards SEP-2127):
  [Replicate changelog](https://replicate.com/changelog/2026-02-10-mcp-server-auto-discovery),
  [roadmap summary](https://innvesti.com/reports/mcp-server-cards-roadmap-discovery-tools-2026/) (secondary)
- Web Bot Auth: [IETF draft](https://datatracker.ietf.org/doc/html/draft-ietf-webbotauth-httpsig-protocol),
  [architecture](https://datatracker.ietf.org/doc/html/draft-meunier-web-bot-auth-architecture)
- WebMCP in Chrome: [developer.chrome.com](https://developer.chrome.com/docs/ai/webmcp)
- Thumbtack in Claude: [Business Wire](https://www.businesswire.com/news/home/20260423884720/en/Thumbtack-Delivers-Home-Services-Experience-in-Anthropics-Claude);
  in ChatGPT: [Business Wire](https://www.businesswire.com/news/home/20251006760229/en/Thumbtack-Partners-with-OpenAI-to-Power-Home-Services-in-ChatGPT);
  Alexa+ with Angi and Yelp: [TechCrunch](https://techcrunch.com/2025/12/23/amazons-ai-assistant-alexa-now-works-with-angi-expedia-square-and-yelp/)
- schema.org actions: [schema.org/docs/actions.html](https://schema.org/docs/actions.html)

---

## What was built (phases 0–2, 2026-11-25)

All in demo mode. Details in the README, "Ordering by outside AI agents".

- **Phase 0:** JSON-LD (`HomeAndConstructionBusiness`) on the home page; `/agents` and `/llms.txt` from one guide
  (`src/lib/agent-guide.ts`); robots.txt keeps `/manage/`, `/confirm/`, `/api/` and `/mcp` out of search. No
  `/.well-known/mcp/server.json` yet: that is phase 3, with the directory listings.
- **Phase 1:** `src/lib/server/orders.ts` (the rules), `agent-api.ts` (seven tools, defined once), the MCP server
  at `/mcp` (stateless Streamable HTTP, JSON responses, protocol versions 2025-03-26 to 2025-11-25), the HTTP API at
  `/api/v1` and `/openapi.json`; signed quote ids; `awaiting_customer` with the customer's confirm page and
  48-hour lapse; idempotent retries; per-IP and per-email limits; the owner page's source labels and **Checked by
  phone** box; sample agent requests on `/owner`. The manage page now shares the change rules with the API. The
  site's own chat assistant still books directly (its customer is right there), but its bookings are now labelled.
- **Phase 2:** unit and endpoint tests (`orders.test.ts`), `npm run smoke:agent` with the official MCP client, and
  the `lesspane-agent` suite in ai-evals.
- **Not built yet:** the hourly spike alert to the owner and the one-booking-per-address-per-week rule (section 3);
  Web Bot Auth checks (phase 4); Eire's own tests with ChatGPT, Claude and a browser agent on staging (section 8:
  they need this on lesspane.net first).

### What the evals found

The first 3-run eval caught a real agent mistake: asked for "next Tuesday morning" on Tuesday 2026-11-24, Gemini
booked 2026-12-02 and told its person "Tuesday, December 2". December 2 is a Wednesday. LessPane can't stop a model
miscounting days, but it can catch it: `request_booking` and `reschedule_booking` now take an optional
`preferred_weekday` and refuse a date that falls on another day (`weekday_mismatch`), and every booking answer
spells the day out (`day_text`) for the agent to repeat to its person.

The second run found a gap in retries. Models make up readable request ids (`booking_20261201_easton_cottage_1`),
so the same id came back in a later conversation and LessPane returned the earlier, already cancelled booking. The
same gap meant anyone who guessed an agent's request id and knew the customer's email and day could have fetched
that booking's private link. A retry now has to bring the same `quote_id` too (stored only as a hash), within 24
hours. The quote id is unguessable and only the agent that asked for it has it; any other match is a new request.
