# Questions for the owner (chat assistant)

The chat assistant (the "Ask us" button on every page) answers from `src/lib/config.ts` and
`src/lib/server/assistant/knowledge.ts`. Where we didn't know the answer, it uses a reasonable value. Each one
is listed here with what the assistant says today and where to change it. Answer them and the values get updated.

Prices are the existing market estimates in `config.ts` (`pricing`), shared with the quote screens.

## Prices

1. **Per-window rate** — is $7 per window, outside only, single story right? (`pricing.perWindow`)
2. **Upper floors** — 2-story × 1.15, 3-story × 1.4. Right? (`pricing.storyFactor`)
3. **Inside and outside** — × 1.7, which is about $12 per window. Right? (`pricing.serviceFactor`)
4. **Extras** — screens $3, tracks and sills $4, hard water $10, each per window. Right? (`pricing.addOns`)
5. **Smallest job** — $150. Right? (`pricing.minimum`)
6. **Regular customers** — is there a discount for a regular schedule (every 3 or 6 months)? The assistant offers
   none today.
7. **Other discounts** — seniors, military, neighbors booking together, or referrals? None offered today.
8. **Bigger jobs** — anything over 300 windows, or over 3 stories, needs you to look first. Is that the right
   cut-off?
9. **Construction cleanup** — paint, stickers or stucco after building work is quoted separately. What do you
   charge, or should it stay "email us"?

## Counting windows (`knowledge.ts`, "COUNTING WINDOWS")

10. Each window counts as one, whatever its style. A sliding or French door counts as one. A picture window
    wider than about 5 feet counts as two. Is that how you count?
11. **Divided panes** — windows with grids (French panes) take longer. Do they cost more?
12. **Storm windows** — do they count as two (storm plus inner)? Do you charge extra to open them?
13. Small door glass, sidelights and transoms are free unless bigger than a sheet of paper. OK?
14. **Typical totals** — cottage 10–15 windows, two-story 20–30, large 40–60+. Rule of thumb: 3–4 per bedroom
    plus 6–10. Do these match homes on the Shore?

## How you work (`config.ts`, `policies`)

15. **Days and hours** — Monday to Saturday, mornings 8–12 and afternoons 12–5, with a text or email the day before
    giving a tighter arrival time. Sundays can still be picked on the booking page. Should they be blocked?
16. **Confirming** — usually within one business day, by text or email. Right?
17. **Payment** — no deposit; pay when the job is done, by card, check or cash. Which methods do you take?
    Venmo or Zelle?
18. **Price changes on the day** — the quoted price is charged unless the home is quite different (for example
    many more windows), and any change is agreed before starting. OK?
19. **Cancelling** — free, any time before the visit day, through the link. Do you want a late-cancel fee?
20. **Weather** — outside work goes ahead in drizzle. Heavy rain, storms, high wind or freezing temperatures mean a
    free reschedule. Right?
21. **Guarantee** — streak-free: tell us within 3 days and we re-clean free. Is that your guarantee, and is 3 days
    right?
22. **Insurance** — the assistant says you carry general liability insurance. **Confirm before launch**, or remove
    it (`policies.insured`).
23. **Being home** — nobody needs to be home for outside-only cleaning (gates unlocked, pets in). An adult must be
    home for inside cleaning. Right?
24. **Getting ready** — clear sills, move fragile things, unlock gates, pets inside. You move light furniture only
    if asked. Right?
25. **How long** — 1–3 hours outside only, about half as long again with inside. Right?
26. **How often** — twice a year, or 3–4 times for waterfront homes. Is that what you recommend?
27. **Not offered** — gutters, solar panels, skylights reached from the roof, buildings over 3 stories, pressure
    washing, commercial storefronts. Do you do any of these, or know someone to refer people to?

## Methods (`knowledge.ts`, "WINDOW CLEANING KNOW-HOW")

28. Do you use **water-fed poles** with purified water for upper floors, ladders, or both? The assistant says both.
29. Cleaning solution — the assistant says "mild, biodegradable". What do you use?
30. **Inside cleaning** — the assistant says drop cloths and shoe covers. True?
31. **Screens** — taken off, brushed, rinsed, dried and put back. Torn screens are pointed out, not repaired. Do you
    repair or replace screens?
32. **Hard water** — light to moderate stains come off; etched glass improves but doesn't look new. Is that what you
    tell customers?
33. **Razor blades** — the assistant says no blades on tempered or coated glass. Is that your practice?

## The business

34. **Name** — should the assistant use a first name for the owner ("Mike will confirm"), or keep "we"?
35. **Contact** — a phone number customers can call or text? The assistant only gives
    `business.contactEmail` (eire@wedocompute.com, until hello@lesspane.com works).
36. **Service area** — all nine Eastern Shore counties are open (`serviceAreaZips`). Trim to where you'll really go?
37. **Reviews and licensing** — the assistant claims no reviews, years in business or licenses. Anything true it
    should mention?
38. **Launch** — when demo mode is turned off (`business.showcase.enabled = false`), the assistant stops saying
    bookings aren't real. Anything else it should say differently at launch?
