# LessPane prototype

Instant window washing quotes and booking requests for lesspane.com.
SvelteKit (TypeScript, Svelte 5) running on Cloud Run, with Firestore for storage.

The flow follows the prototype spec: **Landing → Your home → Your price → Pick a time → Confirmation**,
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

Other commands:

```bash
npm test          # pricing and validation unit tests (Vitest)
npm run check     # TypeScript and Svelte type check
npm run build     # production build into ./build
npm start         # run the production build (node build)
```

Commit `package-lock.json` after the first install.

## Where things live

| Path | What it is |
| --- | --- |
| `src/lib/config.ts` | **All business settings**: per-window rate, factors, add-ons, minimum, service-area ZIPs. Placeholder values. |
| `src/lib/pricing.ts` | Quote formula: `max(minimum, round(windows × rate × story × service + add-ons))` |
| `src/lib/validation.ts` | Input checks shared by all screens |
| `src/lib/server/store.ts` | `quote_requests` storage: Firestore or local JSON file |
| `src/lib/server/email.ts` | Customer confirmation and owner alert via Resend |
| `src/hooks.server.ts` | Basic auth for `/admin`, security headers |
| `src/routes/` | The five screens and `/admin` |
| `static/manifest.webmanifest`, `static/icons/` | PWA manifest and icons (installable to home screen) |
| `Dockerfile`, `cloudbuild.yaml` | Container and Cloud Run deploy |
| `firestore.rules` | Denies all direct client access to Firestore |

Prices are always recomputed on the server; the browser never sends a price.

## Before the pilot

- [ ] Set real prices and the service-area ZIP list in `src/lib/config.ts`
- [ ] Replace placeholder copy on the price page (what's included, when payment is due)
- [ ] Set `OWNER_EMAIL`, and verify `lesspane.com` as a sending domain in Resend

## Deploy to Google Cloud

One-time setup (replace `PROJECT_ID`):

```bash
gcloud config set project PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com firestore.googleapis.com secretmanager.googleapis.com

# Container registry
gcloud artifacts repositories create lesspane --repository-format=docker --location=us-west1

# Firestore database (Native mode)
gcloud firestore databases create --location=us-west1

# Secrets
printf 'a-long-random-password' | gcloud secrets create lesspane-admin-password --data-file=-
printf 're_your_resend_key'     | gcloud secrets create lesspane-resend-api-key --data-file=-
```

Grant permissions (find the numbers in IAM; the defaults are shown):

- Cloud Run runtime service account (`PROJECT_NUMBER-compute@developer.gserviceaccount.com`):
  **Cloud Datastore User** and **Secret Manager Secret Accessor**.
- Cloud Build service account: **Cloud Run Admin**, **Service Account User**, **Artifact Registry Writer**.

Deploy:

```bash
gcloud builds submit --config cloudbuild.yaml
gcloud run services update lesspane --region us-west1 \
  --update-env-vars OWNER_EMAIL=you@example.com,EMAIL_FROM="LessPane <hello@lesspane.com>"
```

No Resend account yet? Remove `RESEND_API_KEY=…` from the `--update-secrets` line in
`cloudbuild.yaml`; emails will be logged to Cloud Logging instead.

To deploy on every push, connect the GitHub repo in Cloud Build → Triggers, pointing at `cloudbuild.yaml`.

Also: set a **billing budget with alerts** before sharing the link.

### lesspane.com and lesspane.net

- Point **lesspane.com** at the service with Cloud Run domain mapping (if available in your region),
  Firebase Hosting rewrites, or a global external Application Load Balancer. All give managed HTTPS.
- Make **lesspane.net** a 301 redirect to `https://lesspane.com` at your registrar or DNS provider.

## Deliberately left out

Accounts, online payments, a live availability calendar, the washer app, recurring plans,
service worker / offline mode / push, and reviews. See the prototype spec.

When it's time for offline support, add `@vite-pwa/sveltekit` to generate a service worker.
