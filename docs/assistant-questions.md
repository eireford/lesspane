# Chat assistant: owner questions

The chat assistant (the "Ask us" button on every page) answers from `src/lib/config.ts` (`pricing`, `policies`) and
`src/lib/server/assistant/knowledge.ts`. When it was built, 38 questions covered every business fact we had to
assume. The owner answered all of them on 2026-11-20. The answers are applied; this page records them and lists
what is still open.

## Still open

- **Phone or text number (Q35).** The owner wants one given to customers but hasn't sent it. Until then the assistant
  gives only `business.contactEmail`. To add it: add the number (and whether it takes texts) to
  `business` in `src/lib/config.ts` and to the "Contact" line in `src/lib/server/assistant/knowledge.ts`.
- **Reviews and endorsements (Q37).** The owner asked for sample endorsements to be added "for now". Not done:
  invented reviews would read as real to customers, and the assistant would repeat them as fact. The assistant
  claims no reviews, years in business, licenses or memberships. When real ones exist, send the exact words and the
  name or source of each and they go in `policies`. (Placeholder testimonials clearly labelled "sample" on the page,
  never in the assistant's answers, are a possible alternative.)
- **Local price check (Q1–Q5).** Prices sit inside published ranges, but no Eastern Shore price list could be found
  online. Compare with two or three local quotes before launch.
- **Licensing.** Check Maryland and county rules for window cleaning before launch (not researched).
- **Launch.** See [launch-checklist.md](launch-checklist.md).

## Decisions (2026-11-20)

| # | Topic | Decision |
| --- | --- | --- |
| 1 | Per-window rate | Keep $7 |
| 2 | Upper floors | **Changed** to ×1.25 (2 floors) and ×1.5 (3 floors), from ×1.15 and ×1.4 |
| 3 | Inside and outside | Keep ×1.7 (about $12 per window) |
| 4 | Extras | Keep screens $3, tracks and sills $4, hard water $10 per window |
| 5 | Smallest job | **Changed** to $120, from $150 |
| 6 | Regular customers | No discount |
| 7 | Other discounts | $20 referral credit on the referring customer's next visit, applied by hand; the referred customer gets no discount (`policies.referral`) |
| 8 | Bigger jobs | Keep: over 300 windows or 3 stories needs the owner to look |
| 9 | Construction cleanup | Keep: email for a separate quote |
| 10 | Counting | Keep: one per window; sliding or French door one; picture window over about 5 ft two; bay one per section |
| 11 | Divided panes | **Added**: grids between the glass count one; true divided light counts two |
| 12 | Storm windows | **Added**: counts two if the storm glass is cleaned too; removal is quoted by email |
| 13 | Small door glass | Keep: free unless bigger than a sheet of paper |
| 14 | Typical totals | Keep |
| 15 | Days | **Changed**: any day including Sunday (matches the booking page) |
| 16 | Confirming | Keep: within one business day |
| 17 | Payment | **Changed**: card, check, cash, Venmo or Zelle; no deposit |
| 18 | Price changes on the day | Keep |
| 19 | Cancelling | Keep: free, no fee |
| 20 | Weather | Keep |
| 21 | Guarantee | Keep: 3 days |
| 22 | Insurance | **Confirmed** by the owner: the assistant may say LessPane carries general liability insurance |
| 23 | Being home | Keep |
| 24 | Getting ready | Keep |
| 25 | How long | Keep |
| 26 | How often | Keep |
| 27 | Not offered | **Changed**: "we can't help with those" (no referral to someone else) |
| 28 | Ladders or poles | Both, as before |
| 29 | Cleaning solution | **Changed**: "a mild window-cleaning solution" (no "biodegradable" claim) |
| 30 | Inside work | Keep: drop cloths or towels, shoe covers |
| 31 | Screens | **Changed**: the owner repairs and re-screens; priced separately by email, no online price (`policies.screenRepair`) |
| 32 | Hard water | Keep |
| 33 | Razor blades | Keep: none on tempered or coated glass |
| 34 | Owner's name | Keep "we" |
| 35 | Contact | Email now; phone number to come (open, above) |
| 36 | Service area | Keep all nine Eastern Shore counties |
| 37 | Reviews and licensing | Claim nothing (open, above) |
| 38 | Launch | Stay in demo mode; launch checklist saved |

## Sources for the price ranges

Published 2025–2026 guides, read as search summaries rather than full pages: Housecall Pro
(housecallpro.com/resources/how-to-price-window-cleaning-guide), HomeGnome (homegnome.com/blog/cost/window-cleaning-price),
HomeStars (homestars.com/cleaning/price-guides/window-cleaning-cost), HomeYou Salisbury MD
(homeyou.com/md/window-cleaning-salisbury-costs), Window Genie (windowgenie.com/durham/prices), Fish Window Cleaning
(fishwindowcleaning.com/about/blog/how-to-count-windows-for-cleaning).
