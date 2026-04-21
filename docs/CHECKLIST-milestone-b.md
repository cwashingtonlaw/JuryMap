# Milestone B Close-out Checklist

## Automated checks (verified 2026-04-20)

- [x] `npm run typecheck` — zero errors
- [x] `npm test` — all unit tests pass (54/54, 15 test files)
- [x] `npm run test:e2e` — all Playwright tests pass (3/3: smoke, questioning-flow, strike-flow)
- [x] `npm run build` — production build succeeds; `dist/sw.js` and `dist/workbox-*.js` exist; PWA banner shown

## Manual walkthrough (pre-trial dry run)

- [ ] Create a case with the capital preset (12 per side)
- [ ] Paste 21 venire rows
- [ ] Complete Questioning → Decision transition via the "Finish Questioning → Decision" button
- [ ] In Decision, mark 6 peremptories across both sides (with race-neutral reasons)
- [ ] Verify Peremptory Tracker rail updates live on the right
- [ ] Verify Batson tally header updates live beneath the case header
- [ ] Mark remaining jurors as kept or cause/excused
- [ ] Click "Finish Decisions" — if kept ≥ target (12 + 2 alternates), jump to Seated Jury; else stay on Decision with "Start Next Panel" enabled
- [ ] On Seated Jury, drag to reorder first 14 into Juror 1..12 + Alternate 1..2
- [ ] "Export PDF Report" — verify preview renders, "Download PDF" produces a valid `.pdf`
- [ ] Cmd/Ctrl+S from Questioning or Decision — verify `.jury` file saves (native save dialog on macOS; downloads on iPad Safari)
- [ ] On Cases screen, "Open .jury File" — import the saved file, verify the case appears with all data
- [ ] Multi-panel flow: keep only 8 jurors in panel 1, finish decisions, click "Start Next Panel", verify panel 2 opens in Questioning mode

## Known limitations for Milestone B (by design — deferred to later milestones)

- **No full Batson Analysis screen** (cross-tab summary + disparate-treatment comparator + pattern flags + motion export) — ships in Milestone C. The live tally header and Peremptory Tracker rail cover the essentials for now.
- **No PWA install onboarding** — ships in Milestone C. Install manually via Chrome → Install app or Safari → Share → Add to Home Screen.
- **No Help screen with shortcut reference** — ships in Milestone C.
- **Mid-panel disqualification reason is stored but not displayed in Decision mode** — the strike picker shows the current strike reason if any, but doesn't surface the questioning-mode `disqualificationReason` because disqualified jurors are already removed from the seated box. PDF export includes both fields.
- **Pre-existing `vite-plugin-pwa` audit warnings** — 4 high-severity in its dependency chain. Transitive and unrelated to any code we've written.

## Milestone B in numbers

- 17 tasks executed
- 14 new commits (on top of Milestone A)
- 3 new screens (Decision, Seated Jury, PDF preview, Peremptory Tracker full-screen)
- 3 new components (StrikePicker, PeremptoryTracker, BatsonTallyHeader)
- 3 new library modules (strike, batson, juryfile) + 1 file I/O wrapper + 1 keyboard hook
- 10 new repository exports (advanceToDecision, markJurorStrike, finishDecisionsForPanel, startNextPanel, seatedJurors, reorderSeatedJurors, importCaseFromFile, plus the existing StrikeInput interface)
- 54 unit tests (up from 26) + 3 E2E tests (up from 2)
