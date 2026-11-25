# LessPane prototype

Instant window washing quotes and booking requests for lesspane.com.
SvelteKit 3 (TypeScript, Svelte 5) running on Cloud Run, with Firestore for storage.

**Live demo:** [lesspane.com](https://lesspane.com) · Built by [Eire Ford](https://eireford.com) to a local window
cleaner's spec, and now kept as a working showcase. Bookings made on the demo are not real jobs.

Highlights:

- A gesture-driven quote flow where every swipe has a tap and keyboard equivalent.
- Prices are recomputed on the server, so the browser never sends a price.
- Customers manage a booking through a private emailed link. No accounts, and only a hash of the token is stored.
- Optional Google Workspace integration (Gmail send, Calendar, admin sign-in) through keyless domain-wide delegation.
- Push to `main` deploys staging; a `v*` tag deploys production on Cloud Run.

The landing page (`/`) explains how it works and offers **two ways in**: pick a **ready-made package**
(Cottage, Family home, Large home: each a sketch, a typical window count and its price; it opens the estimate
summary), or **answer a few quick questions** on `/quote`.

The quick questions are a **short process**. Each step shows a sketch with a sensible default already chosen: accept it
with **✓ Looks right**, or change it by swiping the card or tapping ‹ ›. The estimate stays pinned at the top.

| Step | Options | Starts at |
| --- | --- | --- |
| How many floors? | 1, 2, 3 | 2 |
| Which sides get cleaned? | 1 to 8 sides (past four: a cut corner, an L, an angled L, a T) | four |
| Each side × each floor | None, 1–2, 3–4, 5–6, 7–9, 10+ windows | front and back 3–4, the ends 1–2 |
| Your estimate | summary with "change" links, plus extras: inside, screens, tracks, hard water | no extras |

"Use suggested counts for the rest" jumps from any window step to the summary. Each window range is priced
at its top end (`count` in `src/lib/layout.ts`), so the estimate doesn't come in low.

**Book a time** opens `/book`: the job and its price, a sun dial (tap a day, drag the sun for morning or
afternoon; starts a few days out, not Sunday, morning), and an email (the only required field; name, phone and address are optional, and a ZIP that is given must be
one we serve). ← goes back to the
summary with every choice kept. The saved request includes the window range for every side and floor. A
confirmation page follows,
plus a password-protected owner page at `/admin`.

## Run it locally

Requires Node 22.

```bash
npm install
cp .env.example .env      # then set ADMIN_PASSWORD
npm run dev               # http://localhost:5173
```

Locally, requests are saved to `.data/requests.json` and emails are printed to the terminal,
so you need no Google Cloud or email account to try the whole flow.

**[docs/development.md](docs/development.md)** covers the fast loop: opening it from Windows, phone testing, the headless
smoke test (`npm run smoke`), sample data for `/admin`, running the production container, and one-command
staging deploys.

### Manage your booking (no accounts)

Customers never create an account. Each request gets a private link, `/manage/<token>`, shown on the thanks page
and included in the confirmation email. It shows the booking and, until the visit day, lets the customer pick a
new day and time (the request goes back to "new" for you to reconfirm) or cancel. You and the customer are
emailed about every change.

The token is 24 random bytes. Only its SHA-256 hash is stored (`manage_hash`), so the database alone can't open a
booking; a wrong link returns 404. The page sends `noindex` and `no-store`. Older requests made before this
feature have no link.

## Where things live

| Path | What it is |
| --- | --- |
| `src/lib/config.ts` | **All business settings**: per-window rate, factors, add-ons, minimum, service-area ZIPs. Prices are market estimates; ZIPs are placeholders. |
| `src/lib/pricing.ts` | Quote formula: `max(minimum, round(windows × rate × story × service + add-ons))`; add-ons are per window or per visit |
| `src/lib/validation.ts` | Input checks shared by all screens |
| `src/lib/server/store.ts` | `quote_requests` storage: Firestore or local JSON file |
| `src/lib/server/email.ts`, `messages.ts` | Sending email (Gmail, Resend or the log); the words of every email |
| `src/lib/calendar-event.ts`, `src/lib/server/calendar.ts` | A booking as a Google Calendar event; keeping it in sync |
| `src/routes/owner/`, `src/routes/built/`, `src/lib/server/demo.ts` | Showcase only: the owner's side with sample requests, and "How it's built" |
| `src/hooks.server.ts` | Basic auth for `/admin`, security headers |
| `src/routes/` | The quote screen (`+page.svelte`), confirmation (`quote/thanks`) and `/admin` |
| `src/routes/+page.svelte`, `src/routes/quote/` | Landing page with packages; the quick-questions steps and summary |
| `src/routes/manage/[token]/` | The customer's private manage page: view, reschedule, cancel |
| `src/routes/book/` | Booking page: day and time, contact details, and the server action that saves the request |
| `src/lib/components/` | `RequestCard` (a request as the owner sees it), `LayoutSketch` (the drawing for each step), `SketchWindow`, `SwipeCard`, `SunDial` (booking page); `GrimeDefs` (shared dirt effects), `Icon` |
| `src/lib/layout.ts` | The layout model: floors, sides, window buckets, defaults, and query-string encoding |
| `static/manifest.webmanifest`, `static/icons/` | PWA manifest and icons (installable to home screen) |
| `Dockerfile`, `cloudbuild.yaml` | Container and Cloud Run deploy |
| `firestore.rules` | Denies all direct client access to Firestore |
| `src/lib/server/assistant/` | The chat assistant: Gemini on Vertex AI (`chat.ts`), its knowledge (`knowledge.ts`), its tools (`tools.ts`: estimate, ZIP check, booking) and usage limits (`limits.ts`) |
| `src/routes/api/chat/+server.ts`, `src/lib/components/ChatPanel.svelte` | The chat endpoint and the "Ask us" panel on every page |
| `src/lib/server/orders.ts`, `agent-api.ts`, `src/routes/mcp/`, `src/routes/api/v1/`, `src/routes/confirm/` | Ordering by outside AI agents: the rules, the tool definitions, the MCP server, the HTTP API, the customer's confirm page |

Prices are always recomputed on the server; the browser never sends a price.

## Chat assistant

An **Ask us** button on every page (and a card on the landing page) opens a chat with an AI assistant. It explains
the services and how LessPane works, answers window-cleaning questions, estimates a job and books a visit.

- **Model:** Gemini (`gemini-3.5-flash-lite`) on Vertex AI, called with the Cloud Run account `lesspane-run`
  (Vertex AI User).
- **Prices and bookings:** the assistant uses tools that run the site's own code. `estimate_price` uses
  `computeQuote`, `check_zip` uses the service-area list, and `book_appointment` uses the same validation, storage,
  emails and calendar sync as `/book`. The model never sets a price.
- **Confirmation before booking:** it shows a summary, asks the customer to confirm, books at most once per reply,
  and returns the customer's private manage link.
- **What it knows:** prices and packages come from `config.ts`. How LessPane works is in `policies` in the same
  file. Window-cleaning know-how is in `knowledge.ts`. The owner confirmed them on 2026-11-20; the decisions and what is still open are in
  **[docs/assistant-questions.md](docs/assistant-questions.md)**, and the steps before going live in
  **[docs/launch-checklist.md](docs/launch-checklist.md)**.
- **Usage limits:** 1,000 characters per message, 40 messages per conversation, 10 requests per visitor IP per
  minute (429), and 500 Gemini calls per instance per day (503).
- **Locally:** chat needs Google credentials (`gcloud auth application-default login`) and
  `GOOGLE_CLOUD_PROJECT=lesspane`. Without them the panel shows "isn't available" and the rest of the site works.
- **Testing:** `npm run smoke -- --chat` asks it a question in the browser (a real Gemini call).
- **Other AI agents ordering on their own:** see the next section.

The home page also shows three **sample testimonials** (`testimonials` in `config.ts`), each tagged "Sample". They
show only in showcase mode, and the assistant never quotes them.

## Ordering by outside AI agents

Someone's own AI assistant (ChatGPT, Claude, Gemini or a developer's agent) can price and request a visit for
them, through the same code as the website. The plan, its phases and the decisions behind it are in
**[docs/agent-ordering-plan.md](docs/agent-ordering-plan.md)**; phases 0–2 are built.

| Door | Where | What |
| --- | --- | --- |
| MCP server | `/mcp` | Streamable HTTP, stateless, no sign-in: one JSON-RPC message per POST, one JSON answer (`src/routes/mcp/+server.ts`) |
| HTTP API | `/api/v1/...`, described at `/openapi.json` | The same seven operations as JSON |
| For agents to read | `/agents`, `/llms.txt` | How to order, the rules, the packages (`src/lib/agent-guide.ts`) |
| For search engines | JSON-LD on the home page | `HomeAndConstructionBusiness` with the counties, hours and package prices |

The operations (`src/lib/server/agent-api.ts`, run by `src/lib/server/orders.ts`): `get_business_info`,
`check_service_area`, `get_quote`, `request_booking`, `get_booking`, `reschedule_booking`, `cancel_booking`.

- **Prices:** `get_quote` returns a signed `quote_id` (HMAC with `SESSION_SECRET`, valid 14 days) that carries the
  job and its price. `request_booking` re-prices it with `computeQuote` and refuses a forged, lapsed or out-of-date
  one. An agent never sends a price.
- **A person approves, twice.** The agent must send `approved_by_customer: true`. The request is then saved as
  `awaiting_customer`: no calendar event, no owner alert. The customer gets a "Please confirm" email naming the
  assistant, with a confirm link the agent never sees (`/confirm/<token>`; its buttons post, so email scanners
  can't confirm it). Confirmed, it becomes `new` and the owner hears about it as usual, flagged as an AI agent's
  request with a reminder to phone. Unconfirmed, it lapses after 48 hours.
- **The owner page** shows where every request came from (website, chat, or the agent's name), dims requests
  awaiting the customer, and has a **Checked by phone** box for agent requests.
- **Dates:** agents can miscount days (the evals caught "next Tuesday" booked on a Wednesday). An optional
  `preferred_weekday` makes the server refuse a date on another day, and every answer spells the day out
  (`day_text`).
- **Retries:** the same `request_id` (or `Idempotency-Key`) with the same `quote_id`, within a day, returns the same
  booking. Both are required because models make up readable, guessable ids. The agent's manage token is
  derived from the request id, so it can be given back without being stored.
- **Limits:** 20 requests a minute per IP across the API and MCP, and 3 open requests per email (`agents` in
  `config.ts`). Refusals are 4xx with `{error: {code, message}}`, or an MCP tool result with `isError`.
- **Demo:** every answer carries `demo: true` and a notice. No directory listing until launch.
- **Testing:** unit tests in `src/lib/server/orders.test.ts`; `npm run smoke:agent` (the official MCP client, plus
  `-- --book --log <dev server log>` to book and confirm locally); and the `lesspane-agent` suite in
  [ai-evals](https://github.com/eireford/ai-evals), where Gemini acts as a customer's assistant over MCP.

## Showcase mode

LessPane is currently a portfolio prototype, not a live service. `business.showcase.enabled` in `src/lib/config.ts`
adds a "Demo" note to every page, a "Built by" credit and source link in the footer, and tells customers on the
confirmation page and in the confirmation email that no one will come to clean. While it is on, the demo also shows the side
a visitor would otherwise never see:

- **`/owner`, the owner's side:** made-up sample requests (`src/lib/server/demo.ts`, priced by `computeQuote`) in
  the same request cards as `/admin`, the next seven days of the owner's Google Calendar, and the owner's inbox.
  Visitors can confirm or cancel a request and watch the calendar follow (tentative → confirmed → gone). Nothing is
  saved or sent, and it never reads the real store.
- **What the owner got:** straight after a booking, the thanks page shows the owner's alert email and calendar event
  for that booking. It needs the booking's private token, like the manage link, because it holds contact details.
- **`/built`, how it's built:** the flow of one booking, the engineering under it, the stack, and links to the
  source and the assistant's evals.

The emails and calendar events on these pages come from the code that sends them (`src/lib/server/messages.ts`,
`src/lib/calendar-event.ts`). Both pages return 404 when showcase mode is off. Set it to `false` at launch.

## Before the pilot

- [ ] Confirm the estimated prices against local competitor quotes, and set the service-area ZIP list, in `src/lib/config.ts`
- [ ] Replace placeholder copy on the price page (what's included, when payment is due)
- [ ] Set `OWNER_EMAIL`, and verify `lesspane.com` as a sending domain in Resend

## Deploy to Google Cloud

The app has its own Google Cloud project, **`lesspane`** (billed to the "primary" billing account).
One-time setup is already done:

| Resource | Value |
| --- | --- |
| APIs | Run, Cloud Build, Artifact Registry, Firestore, Secret Manager |
| Container registry | `us-west1-docker.pkg.dev/lesspane/lesspane` |
| Firestore | `(default)` (production) and `staging` databases, Native mode, `us-west1` |
| Secrets | `lesspane-admin-password`, `lesspane-staging-admin-password` (random; read them with the command below) |
| Runtime account | `lesspane-run@`: Cloud Datastore User; Secret Accessor on its own secrets only |
| Deployer account | `lesspane-build@`: Run Admin, Artifact Registry Writer, Log Writer, Storage Object Viewer, Service Account User on `lesspane-run` |
| GitHub | `eireford/lesspane`, linked through the Cloud Build connection `lesspane-github` |

Your gcloud default project may be a different one, so pass `--project lesspane` to every command.

### Staging and production

| | Staging | Production |
| --- | --- | --- |
| Domain | https://lesspane.net | https://lesspane.com |
| Cloud Run service | `lesspane-staging` | `lesspane` |
| Firestore database | `staging` | `(default)` |
| Admin secret | `lesspane-staging-admin-password` | `lesspane-admin-password` |
| Deploys when | you push to `main` (trigger `lesspane-staging`) | you push a `v*` tag (trigger `lesspane-production`) |

Staging sends `X-Robots-Tag: noindex` so it stays out of search results.

The feature-tour slides are kept outside the app, as a Claude Slides deck:
https://claude.ai/artifact/XaSD4ek8sxbtncPPzrBVJG (download as PDF or PowerPoint from its Share menu).
`/deck` on either site redirects there; change `business.deckUrl` in `src/lib/config.ts` to point it elsewhere.

Release to production after checking staging:

```bash
# bump "version" in package.json in the pull request, merge it, then tag that commit:
git tag vX.Y.Z && git push origin vX.Y.Z
```

Set the owner alert address once per service (deploys keep it):

```bash
gcloud run services update lesspane --project lesspane --region us-west1 \
  --update-env-vars OWNER_EMAIL=you@example.com,EMAIL_FROM="LessPane <hello@lesspane.com>"
```

Admin password for the deployed `/admin` page (use `lesspane-staging-admin-password` for staging):

```bash
gcloud secrets versions access latest --secret lesspane-admin-password --project lesspane
```

Emails are logged to Cloud Logging until Resend is set up. To turn them on:

```bash
printf 're_your_resend_key' | gcloud secrets create lesspane-resend-api-key --data-file=- --project lesspane
gcloud secrets add-iam-policy-binding lesspane-resend-api-key --project lesspane \
  --member serviceAccount:lesspane-run@lesspane.iam.gserviceaccount.com --role roles/secretmanager.secretAccessor
```

then append `,RESEND_API_KEY=lesspane-resend-api-key:latest` to the `--update-secrets` line in `cloudbuild.yaml`.

Also: set a **billing budget with alerts** before sharing the link.

### Costs

At prototype traffic everything stays inside Google Cloud's free allowances; the domains (about $20 a year each)
are the real cost. Two guards are in place:

- **Image cleanup**: Artifact Registry keeps the 10 newest images per service and deletes others after 30 days
  (`infra/artifact-cleanup.json`; reapply with `gcloud artifacts repositories set-cleanup-policies lesspane
  --location us-west1 --project lesspane --policy=infra/artifact-cleanup.json --no-dry-run`).
- **Budget alert**: "LessPane monthly", $10 on the `primary` billing account, filtered to this project. It emails
  the billing account's admins at 50%, 90% and 100% of actual spend and when the forecast passes 100%.

### Domains

Both domains are registered at Squarespace Domains, which also hosts their DNS. Each is mapped to its
Cloud Run service with Cloud Run domain mapping, which provides managed HTTPS certificates.
`www.` is mapped on both, too.

DNS records at Squarespace (same for both domains; the Squarespace default A and `www` records are removed):

| Host | Type | Data |
| --- | --- | --- |
| `@` | A | `216.239.32.21`, `216.239.34.21`, `216.239.36.21`, `216.239.38.21` |
| `@` | AAAA | `2001:4860:4802:32::15`, `2001:4860:4802:34::15`, `2001:4860:4802:36::15`, `2001:4860:4802:38::15` |
| `www` | CNAME | `ghs.googlehosted.com.` |
| `@` | TXT | `google-site-verification=…` (proves ownership to Google; keep it) |

## Google Workspace

LessPane uses the **wedocompute.com** Google Workspace for four things. Each is off until configured, and none
can lose a booking: failures are logged.

| Feature | Setting (Cloud Run env var) | Status |
| --- | --- | --- |
| Owner alerts (new, rescheduled, cancelled) | `OWNER_EMAIL=eire@wedocompute.com` | set on both services |
| Send email through Gmail, from hello@lesspane.com | `GMAIL_USER=eire@wedocompute.com`, `EMAIL_FROM=LessPane <hello@lesspane.com>` | after setup below |
| Bookings on Google Calendar (tentative until confirmed; moved on reschedule; removed on cancel) | `CALENDAR_ID` (default: primary calendar of `CALENDAR_USER`, default `GMAIL_USER`) | after setup below |
| Google sign-in for `/admin` | `GOOGLE_CLIENT_ID`, secret `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS=eire@wedocompute.com`, secret `SESSION_SECRET` | `ADMIN_EMAILS` and `SESSION_SECRET` set; client after setup below |

How it connects: Gmail and Calendar calls run as `lesspane-run@lesspane.iam.gserviceaccount.com` using **keyless
domain-wide delegation** (`src/lib/server/google.ts`): the service account signs a short-lived token naming the
Workspace user, through the IAM Credentials API. No key files exist.

### One-time setup

1. **Let the service account sign its own tokens** (Google Cloud):
   ```bash
   gcloud iam service-accounts add-iam-policy-binding lesspane-run@lesspane.iam.gserviceaccount.com --project lesspane --member=serviceAccount:lesspane-run@lesspane.iam.gserviceaccount.com --role=roles/iam.serviceAccountTokenCreator
   ```
2. **Domain-wide delegation** (admin.google.com → Security → Access and data control → API controls → Manage
   domain-wide delegation → Add new): client ID `101238317875828045942`, scopes
   `https://www.googleapis.com/auth/gmail.send,https://www.googleapis.com/auth/calendar.events`.
3. **lesspane.com mail in Workspace** (admin.google.com → Account → Domains → Manage domains → Add a domain →
   lesspane.com as a **secondary domain**, verify it with the TXT record it shows). Then Directory → Users →
   eire@wedocompute.com → Add alternate email: `hello@lesspane.com`. In Gmail as eire@wedocompute.com:
   Settings → Accounts → Send mail as → Add `LessPane <hello@lesspane.com>`.
4. **lesspane.com DNS at Squarespace**: MX `@` → `1 smtp.google.com`; replace the TXT `v=spf1 -all` with
   `v=spf1 include:_spf.google.com ~all`; DKIM TXT at `google._domainkey` from admin.google.com → Apps → Gmail →
   Authenticate email (domain lesspane.com); DMARC TXT at `_dmarc`: `v=DMARC1; p=none; rua=mailto:hello@lesspane.com`.
5. **OAuth client for /admin sign-in** (console.cloud.google.com, project lesspane → Google Auth Platform):
   app name LessPane, audience External, publish; Clients → Create client → Web application, redirect URIs
   `https://lesspane.com/auth/callback`, `https://lesspane.net/auth/callback`. Then:
   ```bash
   printf '%s' 'CLIENT_SECRET' | gcloud secrets create lesspane-google-client-secret --data-file=- --project lesspane
   gcloud secrets add-iam-policy-binding lesspane-google-client-secret --project lesspane --member=serviceAccount:lesspane-run@lesspane.iam.gserviceaccount.com --role=roles/secretmanager.secretAccessor
   ```
6. **Turn it on** (per service, kept across deploys):
   ```bash
   gcloud run services update lesspane-staging --project lesspane --region us-west1 \
     --update-env-vars GMAIL_USER=eire@wedocompute.com,EMAIL_FROM="LessPane <hello@lesspane.com>",GOOGLE_CLIENT_ID=CLIENT_ID \
     --update-secrets GOOGLE_CLIENT_SECRET=lesspane-google-client-secret:latest
   ```
   Repeat for `lesspane` (production) after staging works.

## Look and feel

Everything is a pencil sketch with watercolor color on a white page: the house front for the floors step, a
plan view for the sides step, and each side's wall, floor by floor, for the window steps (`LayoutSketch.svelte`).
Lines get a slight hand-drawn wobble from SVG filters, and dirt is pencil hatching (`SketchDefs.svelte`).
Headings and prices use the Patrick Hand font from Google Fonts.

## Deliberately left out

Accounts, online payments, a live availability calendar, the washer app, recurring plans,
service worker / offline mode / push, and reviews. See the prototype spec.

When it's time for offline support, add `@vite-pwa/sveltekit` to generate a service worker.
