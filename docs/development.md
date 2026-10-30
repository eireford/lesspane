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
| `npm run dev` | Dev server at http://localhost:5173 with hot reload | Always running while you work |
| `npm run dev:phone` | Same, but reachable from other devices on your network | Trying swipes and drags on a real phone |
| `npm run smoke` | Headless Chromium plays every control with real gestures and screenshots each step into `.shots/` | After any UI change |
| `npm run smoke -- --book` | …and submits a booking (local servers only) | After touching the form or server code |
| `npm run test:watch` | Unit tests (pricing, validation), rerun on save | Changing `src/lib/pricing.ts`, `validation.ts` or `config.ts` |
| `npm run check:watch` | Type check, rerun on save | Larger refactors |
| `npm run seed` | Adds 8 sample requests so `/admin` has data (`-- --reset` replaces them) | Working on the owner page |
| `npm run verify` | Type check + unit tests + production build | Before pushing |
| `npm run docker:run` | Builds and runs the real production container at http://localhost:8080 | Changing the Dockerfile, build or server setup |
| `npm run deploy:staging` | Deploys your working tree (uncommitted changes included) to https://lesspane.net | Showing someone a change without pushing |

## The smoke test

`scripts/smoke.mjs` drives Chromium over the DevTools protocol using only Node built-ins. It swipes
the house card, pulls the squeegee to both ends, flips the window, peels two stickers, picks a day and
drags the sun, checking the price reacts at each step. It fails on any page error.

```bash
npm run smoke                                     # dev server, phone size
npm run smoke -- --url https://lesspane.net       # staging (never books)
npm run smoke -- --width 1280 --height 900        # desktop size
npm run smoke -- --chrome /path/to/chrome         # or set CHROME=…
```

Screenshots are numbered by step, and a failing step saves `NN-FAILED-….png`. When you add or rename
a control, update the selectors in the script (`.house-stack .swipe`, `.glass`, `.flip`, `.sticker`,
`.chip`, `.day`, `.sky`, `.amount`, `.send`).

## Testing on a phone

Touch gestures behave differently from a mouse, so check swipes and drags on a real phone.

1. Run `npm run dev:phone`. Vite prints `Network:` addresses.
2. On a phone on the same Wi-Fi, open the address that matches your computer's LAN IP (for example
   `http://10.0.0.71:5173`).

On Windows with WSL, this works when WSL uses mirrored networking (the LAN address appears in the
`Network:` list). If the phone can't connect, allow the port through the Windows firewall from an
administrator PowerShell:

```powershell
New-NetFirewallRule -DisplayName "LessPane dev" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
```

With mirrored networking you may also need to allow it through the Hyper-V firewall:

```powershell
Set-NetFirewallHyperVVMSetting -Name '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}' -DefaultInboundAction Allow
```

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

## Editing prices, photos and copy

- Prices, add-ons, service-area ZIPs, time windows: `src/lib/config.ts`. Unit tests cover the formula
  in `src/lib/pricing.ts`.
- House photos: `src/lib/photos.ts` and `static/photos/`. Each house lists its windows as
  `[x, y, width, height]` in pixels of the 1280px image. To check a new house, run the dev server
  and look at it in the house card; the grime should sit exactly on the glass.
- Estimate terms (the ⓘ panel): `src/routes/+page.svelte`.
