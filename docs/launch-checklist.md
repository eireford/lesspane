# Launch checklist

LessPane is a demo: bookings aren't real, every page says so, and the chat assistant says so. Before turning demo
mode off (`business.showcase.enabled = false` in `src/lib/config.ts`), every item here becomes a real promise to real
customers.

- [ ] **Someone checks requests within one business day.** The site and the assistant promise it
  (`policies.confirmation`).
- [ ] **Phone or text number.** Add it (`docs/assistant-questions.md`, Q35) only if it will be answered.
- [ ] **Email address.** `business.contactEmail` is eire@wedocompute.com. Switch to hello@lesspane.com once a test
  message to it arrives (README, "Email").
- [ ] **Insurance.** The assistant says LessPane carries general liability insurance (`policies.insured`). Keep a
  current certificate; remove the line if it lapses.
- [ ] **Licensing.** Check Maryland and county rules for window cleaning.
- [ ] **Prices.** Compare with two or three local quotes (`pricing` in `config.ts`).
- [ ] **Service area.** All nine counties are open (`serviceAreaZips`). Trim to where you'll really drive.
- [ ] **Payment.** The assistant says card, check, cash, Venmo or Zelle, no deposit. Have each ready.
- [ ] **Guarantee.** The assistant promises a free re-clean within 3 days. Only keep it if it will be honored.
- [ ] **Referral credit.** $20 off the referring customer's next visit, applied by hand; the new customer gets
  nothing (`policies.referral`).
- [ ] **Equipment and methods.** The assistant says ladders with standoffs and water-fed poles, drop cloths or
  towels, and shoe covers indoors. Make sure that's what happens.
- [ ] **Reviews.** The sample testimonials hide themselves when demo mode is off. Add real ones (`sample: false`, the
  customer's exact words and permission) and delete the samples (`testimonials` in `config.ts`).
- [ ] **Demo notices.** Remove the demo banner, the builder credit and the "nobody will come" text on the thanks page
  and in the confirmation email, as well as in the chat.
- [ ] **Real calendar and email.** Confirm Gmail send and Calendar sync work for the live owner account.
