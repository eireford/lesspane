# LessPane

SvelteKit 2 + Svelte 5 (runes) + TypeScript prototype for instant window-cleaning quotes, deployed to Cloud Run.
See `README.md` for the product and infrastructure, and `docs/development.md` for the local workflow.

## Commands

- `npm run dev`: dev server on http://localhost:5173 (file storage, emails to console)
- `npm run verify`: type check + unit tests + build. Run before committing.
- `npm run smoke`: headless Chromium plays every control; needs the dev server running. Add `-- --book` to
  also submit a booking. Screenshots land in `.shots/`; read them to check visual changes.
- `npm run seed`: sample requests for `/admin`.

## Conventions

- The quote is a step-by-step process (floors → sides, up to 8 → windows per side and floor, in buckets → summary).
  Every step starts on a sensible default; the user accepts it or changes it by swiping or tapping ‹ ›.
  Keep every gesture paired with a tap or keyboard path. The look is pencil sketches with watercolor color on
  white, with short hand-lettered labels.
- All prices are recomputed on the server (`src/routes/book/+page.server.ts`); the browser never sends one.
- Business numbers live only in `src/lib/config.ts`.
- Pushing to `main` deploys staging (lesspane.net); only a `v*` tag deploys production (lesspane.com).
  Confirm with the user before tagging.
- The snap-packaged Chromium can't read or write `/tmp`; keep browser profiles and screenshots under the project.
