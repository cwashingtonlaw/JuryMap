# Milestone C Close-out Checklist

## Automated checks (verified 2026-04-20)

- [x] `npm run typecheck` — zero errors
- [x] `npm test` — all unit tests pass (76 across 20 test files)
- [x] `npm run test:e2e` — all Playwright tests pass (4: smoke, questioning-flow, strike-flow, batson-analysis)
- [x] `npm run build` — production build succeeds; `dist/sw.js` and `dist/workbox-*.js` exist

## Manual walkthrough

- [ ] Install the app as a PWA on your trial device (onboarding banner appears on first run on eligible browsers)
- [ ] Run a full voir dire: create → import venire → question → decision → seated → PDF
- [ ] During Decision, make several race-differentiated peremptory strikes
- [ ] Open Batson Analysis from the Decision header link; verify cross-tab, strike log, and pattern flags
- [ ] Click a struck juror row; verify comparator list shows kept jurors of a different race with shared attributes
- [ ] Click "Export Motion Draft"; verify the HTML draft opens in a new tab with case caption, strike table, and comparator analysis
- [ ] Open Help from the Cases header → verify keyboard shortcut table and pre-trial checklist render
- [ ] Archive a completed case (Archive button on the row); toggle "Show archived" and verify it reappears; click Unarchive to restore

## Milestone C in numbers

- 10 tasks executed
- 4 new screens (BatsonAnalysis, InstallOnboarding, Help, plus updated CaseList)
- 4 new components (BatsonCrossTab, BatsonStrikeLog, ComparatorList, BatsonPatternFlags)
- 3 new library modules (batson-analysis, batson-motion, platform)
- 2 new repository exports (archiveCase, unarchiveCase)
- 22 new unit tests (54 → 76) + 1 new E2E (3 → 4)

## Limitations remaining after v1 (future work)

- **No real-time device sync** — `.jury` files + iCloud Drive are the handoff; a backend-powered sync would be a follow-up.
- **No AI-powered PDF questionnaire extraction** — intentionally deferred; CSV/JSON paste is the v1 import.
- **No app-level PIN / Face ID lock** — security relies on device-level encryption.
- **No firm-specific motion template customization** — the Batson motion HTML is a generic starter draft.
- **No aggregated juror intelligence across cases** — explicitly excluded during spec brainstorming.
- **No editable keyboard shortcut remapping** — bindings are fixed.
- **PWA install cannot be triggered programmatically on iOS Safari** — Apple's constraint; onboarding provides instructions instead.
