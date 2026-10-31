# Local development

Everything runs locally without Google Cloud or an email account: requests go to `.data/requests.json`
and emails print to the terminal. The fast loop is **edit → browser hot-reloads → `npm run smoke`**.

## First time

Needs Node 20+ (22 is what Cloud Run uses) and, for the smoke test, Chromium or Chrome.

```bash
npm install
cp .env.example .env
```

Then set `ADMIN_PASSWORD` in `.env` (any username works at `/admin`).

## Everyday commands

| Command | What it does | When |
| --- | --- | --- |
| `npm run dev` | Dev server at http://localhost:5173 with hot reload, also in your Windows browser | Always running while you work |
| `npm run smoke` | Headless Chromium plays every control with real gestures and screenshots each step into `.shots/` | After any UI change |
| `npm run smoke -- --book` | …and submits a booking (local servers only) | After touching the form or server code |
| `npm run test:watch` | Unit tests (pricing, validation), rerun on save | Changing `src/lib/pricing.ts`, `validation.ts` or `config.ts` |
| `npm run check:watch` | Type check, rerun on save | Larger refactors |
| `npm run seed` | Adds 8 sample requests so `/admin` has data (`-- --reset` replaces them) | Working on the owner page |
| `npm run verify` | Type check + unit tests + production build | Before pushing |
| `npm run docker:run` | Builds and runs the real production container at http://localhost:8080 | Changing the Dockerfile, build or server setup |
| `npm run icons` | Re-renders the favicon and app icons from `static/icon.svg` with headless Chromium | After editing the icon |
| `npm run deploy:staging` | Deploys your working tree (uncommitted changes included) to https://lesspane.net | Showing someone a change without pushing |

## The smoke test

`scripts/smoke.mjs` drives Chromium over the DevTools protocol using only Node built-ins. It swipes
walks the quote process: changes the floors with the arrow, swipes the sides card, swipes a window bucket,
skips to the summary with suggested counts, adds two extras, opens the booking page (checking the price
carried over), picks a day and drags the sun, checking the price reacts at each step. It fails on any page error.

```bash
npm run smoke                                     # dev server, phone size
npm run smoke -- --url https://lesspane.net       # staging (never books)
npm run smoke -- --width 1280 --height 900        # desktop size
npm run smoke -- --chrome /path/to/chrome         # or set CHROME=…
```

Screenshots are numbered by step, and a failing step saves `NN-FAILED-….png`. When you change the
steps or rename elements, update the step titles and selectors in the script (`.flow .title`, `.value strong`,
`.flow .swipe`, `.summary .lines`, `.extra`, `.book-cta`, `.day`, `.sky`, `.amount`, `.summary .amount`, `.send`).

## Opening it from Windows (WSL)

WSL runs in its default **NAT** networking mode, where Windows forwards `localhost` into WSL. So http://localhost:5173
works in Chrome on Windows while `npm run dev` runs in WSL. The dev server listens on `::` (IPv6 and IPv4),
because Chrome tries `localhost` as `::1` first.

Don't switch WSL to `networkingMode=mirrored` in `C:\Users\eiref\.wslconfig`. On this PC, mirrored mode dropped
every connection from Windows to WSL, even with the Hyper-V firewall opened.

If http://localhost:5173 stops loading:

1. Check the dev server is running in WSL: `ss -ltn | grep 5173`.
2. Try http://127.0.0.1:5173.
3. Restart WSL from PowerShell with `wsl --shutdown`, then reopen the terminal and run `npm run dev`.
   Forwarding sometimes stops after Windows sleeps or the network changes.

## Testing on a phone

Touch gestures behave differently from a mouse, so check swipes and drags on a real phone. In NAT mode
your phone can't reach the dev server directly, so the quickest route is staging:

```bash
npm run deploy:staging     # current working tree to https://lesspane.net in about 2 minutes
```

Then open https://lesspane.net on the phone (any network).

## The production container

`npm run docker:run` builds the same image Cloud Run runs and serves it with your `.env` (so file
storage and console email). Open it at **http://localhost:8080**, not `127.0.0.1`: the container's
`ORIGIN` is `localhost`, and SvelteKit rejects form posts from a different origin.

The script uses a throwaway `DOCKER_CONFIG`, because Docker Desktop's credential helper
(`docker-credential-desktop.exe`) fails inside WSL and blocks even public image pulls. To fix that
for all Docker use, remove `"credsStore": "desktop.exe"` from `~/.docker/config.json`.

## Where things show up locally

| Thing | Where |
| --- | --- |
| Quote requests | `.data/requests.json` (delete the file to start fresh) |
| Emails | The `npm run dev` terminal |
| Owner page | http://localhost:5173/admin, password from `ADMIN_PASSWORD` in `.env` |
| Smoke screenshots | `.shots/` (ignored by git) |

## Shipping

- Push to `main` → Cloud Build deploys staging (https://lesspane.net) in about 2 minutes.
- Push a `v*` tag → production (https://lesspane.com).
- `npm run deploy:staging` skips the commit when you just want to show something.
- After a staging deploy: `npm run smoke -- --url https://lesspane.net`.

## Editing prices, houses and copy

- Prices, add-ons, service-area ZIPs, time windows: `src/lib/config.ts`. Unit tests cover the formula
  in `src/lib/pricing.ts`.
- The quote steps: window buckets, side names and defaults in `src/lib/layout.ts` (unit-tested); the step
  flow in `src/routes/+page.svelte`; the drawings in `src/lib/components/LayoutSketch.svelte`.
- Estimate terms (the ⓘ panel): `src/routes/+page.svelte`. Booking page and its server action: `src/routes/book/`.
