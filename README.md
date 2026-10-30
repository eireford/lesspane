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

The app has its own Google Cloud project, **`lesspane`** (billed to the "primary" billing account).
One-time setup is already done:

| Resource | Value |
| --- | --- |
| APIs | Run, Cloud Build, Artifact Registry, Firestore, Secret Manager |
| Container registry | `us-west1-docker.pkg.dev/lesspane/lesspane` |
| Firestore | `(default)` database, Native mode, `us-west1` |
| Secret | `lesspane-admin-password` (random; read it with the command below) |
| Runtime account | `lesspane-run@`: Cloud Datastore User; Secret Accessor on its own secrets only |
| Deployer account | `lesspane-build@`: Run Admin, Artifact Registry Writer, Log Writer, Storage Object Viewer, Service Account User on `lesspane-run` |

Your gcloud default project may be a different one, so pass `--project lesspane` to every command.

Deploy:

```bash
gcloud builds submit --project lesspane --config cloudbuild.yaml
gcloud run services update lesspane --project lesspane --region us-west1 \
  --update-env-vars OWNER_EMAIL=you@example.com,EMAIL_FROM="LessPane <hello@lesspane.com>"
```

Admin password for the deployed `/admin` page:

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
