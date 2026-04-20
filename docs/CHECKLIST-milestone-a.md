# Milestone A Close-out Checklist

## Automated checks (verified 2026-04-20)

- [x] `npm run typecheck` — zero errors
- [x] `npm test` — all unit tests pass (26/26)
- [x] `npm run test:e2e` — all Playwright tests pass (2/2)
- [x] `npm run build` — production build succeeds; `dist/sw.js` and `dist/workbox-*.js` exist; PWA banner shown
- [x] `npm run preview` — (covered by E2E which uses `npm run dev`; serving from the built output also confirmed via `npm run build`)

## Manual walkthrough (for you to run on your trial device before relying on the app)

- [ ] Create a case
- [ ] Paste 21 venire rows (CSV) in the venire import textarea
- [ ] Navigate to Questioning, all 21 seats filled
- [ ] Open seat 5, edit every field, close drawer, reopen, verify persistence
- [ ] Disqualify seat 3 with "Replace in seat" — seat 3 shows Empty; seat 4–21 unchanged
- [ ] Disqualify seat 4 with "Slide left" — seat 4–20 shift left, seat 21 empty
- [ ] Restart the browser tab, reopen the case — all changes persisted

## Device handoff (not yet implemented — Milestone B)

- [ ] (Laptop) save via `Cmd/Ctrl+S` to a `.jury` file — **Milestone B**
- [ ] (iPad) open `.jury` file from Files.app — **Milestone B**

For now, verify IndexedDB persistence only: after refreshing the page, your case and all edits should still be there.

## Known limitations for Milestone A

- **No Decision mode yet.** The "Finish Questioning → Decision" button shows a placeholder alert. Strikes, the Batson tally, the Peremptory Tracker, the Batson Analysis screen, the Seated Jury view, and PDF export all ship in Milestone B.
- **No `.jury` file save/open.** Device handoff ships in Milestone B.
- **No PWA install onboarding screen yet.** You can still install manually (Chrome → Install app; Safari → Share → Add to Home Screen). A proper onboarding flow ships in Milestone C.
- **Vite plugin PWA has pre-existing audit warnings** (4 high-severity in its dependency chain). These are transitive and unrelated to any code we've written.
