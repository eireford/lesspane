# LessPane prototype

Instant window washing quotes and booking requests for lesspane.com.
SvelteKit (TypeScript, Svelte 5) running on Cloud Run, with Firestore for storage.

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

Requires Node 20 or newer.

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
| `src/lib/server/email.ts` | Customer confirmation and owner alert via Resend |
| `src/hooks.server.ts` | Basic auth for `/admin`, security headers |
| `src/routes/` | The quote screen (`+page.svelte`), confirmation (`quote/thanks`) and `/admin` |
| `src/routes/+page.svelte`, `src/routes/quote/` | Landing page with packages; the quick-questions steps and summary |
| `src/routes/manage/[token]/` | The customer's private manage page: view, reschedule, cancel |
| `src/routes/book/` | Booking page: day and time, contact details, and the server action that saves the request |
| `src/lib/components/` | `LayoutSketch` (the drawing for each step), `SketchWindow`, `SwipeCard`, `SunDial` (booking page); `GrimeDefs` (shared dirt effects), `Icon` |
| `src/lib/layout.ts` | The layout model: floors, sides, window buckets, defaults, and query-string encoding |
| `static/manifest.webmanifest`, `static/icons/` | PWA manifest and icons (installable to home screen) |
| `Dockerfile`, `cloudbuild.yaml` | Container and Cloud Run deploy |
| `firestore.rules` | Denies all direct client access to Firestore |

Prices are always recomputed on the server; the browser never sends a price.

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
git tag v0.1.0 && git push origin v0.1.0
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
