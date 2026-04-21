# Milestone D Close-out Checklist

## Automated checks (verified 2026-04-20)

- [x] `npm run typecheck` — zero errors
- [x] `npm test` — 96/96 pass (22 test files, up from 77)
- [x] `npm run test:e2e` — 4/4 pass
- [x] `npm run build` — production build succeeds; `dist/sw.js` and `dist/workbox-*.js` exist
- [x] `npm run tauri:build` — native `.app` bundle rebuilt and reinstalled at `/Applications/Jury Selection.app`

## Manual walkthrough

- [ ] Open the app; create a case with **Venire size = 6** (small panel) and layout **snake** — verify the grid shows a snake layout, empty seats clickable, and `Finish Questioning` requires only 6 named seats.
- [ ] Create a separate case at the LA default (21, rows). Click a seat, type a name. From the juror drawer, tap **Walk through an analogy…**, pick **Pilot and the Plane**. Step through the 3 prompts. Tap yes / hesitant / no on each checkpoint. Close the prompter.
- [ ] Reopen that juror — verify the **Analogy responses** summary block at the bottom of the drawer shows the recorded responses with colored badges.
- [ ] In the same juror drawer, add a reaction ("nodded on burden of proof"). Verify it lists with a timestamp.
- [ ] Click the **Analogy report** link in the Questioning header. Verify the juror appears with one row, columns for each checkpoint, badges for the responses.
- [ ] Advance to Decision. Click a seat. In the picker, use the **Strike priority** row to set priority 4. Close the picker. Verify the seat shows a red ring.
- [ ] Make enough strikes against one race to trigger a **Fisher's exact alert** on the Batson Analysis screen — the flag should show with a p-value in the message.
- [ ] Open Help — verify the new Analogy library, Strike priority, Apple Pencil, and Venire sections all render.
- [ ] Cmd+S save the case. On the Cases list, **Open .jury File** the saved file. Verify it loads cleanly.

## Milestone D by the numbers

- 16 tasks executed
- **+19 unit tests** (77 → 96)
- 4 new React components (`AnalogyLibrary`, `AnalogyPrompter`, `JurorAnalogySummary`, `ReactionLog`) plus extensions to `SeatCard`, `SeatGrid`, `StrikePicker`, `JurorDrawer`
- 2 new library modules (`content/analogies`, `lib/fisher`) plus extensions to `batson-analysis` and `db/migrations`
- 1 new screen (`AnalogyReport`) + 1 new route (`/cases/:caseId/analogies`)
- Schema migration v1 → v2 (additive; all prior `.jury` files still load)
- 0 new runtime dependencies — pure TypeScript throughout

## Explicitly deferred from the features doc

Documented in the Milestone D plan. Not built, by design:

- **Multi-user / cloud spotter–presenter sync** (contradicts solo+offline decision)
- **OSINT social-media scraping** (requires backend; ABA ethics constraints)
- **AI / NLP Big Five psychographic profiling** (requires backend + Explainable-AI guarantees)
- **Cross-case historical prosecutor strike database** (contradicts no-carryover decision)
- **Questionnaire PDF OCR** (deferable; CSV/JSON paste ships today)

## v1+ status

With Milestone D complete, the app provides:

- Full voir dire workflow (Questioning → Decision → Seated) across multiple panels
- Flexible venire sizes (6, 12, 21, 60, 100, custom) and two seat layouts (rows, snake)
- Full Batson toolset: live tally header, peremptory tracker, cross-tab, strike log, disparate-treatment comparators, 80%-skew warnings, prima-facie alerts, Fisher's-exact statistical significance alerts, and HTML motion-draft export
- Interactive analogy library (7 frameworks, 5 topics) with per-juror checkpoint tracking and case-level response matrix
- Freeform reaction log per juror
- Strike-priority ranking visible as ring overlay during Decision mode
- PDF record of the whole case
- `.jury` file save/open for device handoff
- PWA installable on macOS (Chrome/Edge) and iPadOS (Safari)
- Native macOS `.app` bundle via Tauri
