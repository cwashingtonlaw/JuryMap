# Jury Selection App — Milestone D: Substantive legal tooling + venire flexibility

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transition the app from passive record-keeping to active tactical advising. Adds an interactive library of criminal-defense analogies with per-juror reaction tracking, configurable venire sizes (LA default 21, but also 6, 12, 60, custom), snake-seating layout, a strike-priority ring on Decision mode, and a Fisher's-exact-test reinforcement of the Batson pattern flags. No backend, no AI, no cross-case data — everything client-side and honoring the solo-use design.

**Architecture:** Bump `schemaVersion` to 2. Add a v1→v2 migration that defaults `venireSize=21`, `seatLayout='rows'`, `juror.reactions=[]`, `juror.strikePriority=0`. Extend existing modules; no new runtime deps.

**Tech Stack:** Same as prior milestones (React 19, Vite 6, TS 5, Tailwind v4, Dexie, Zustand). Fisher's exact test is pure TypeScript.

**Spec:** `docs/superpowers/specs/2026-04-20-jury-selection-app-design.md` (original spec; this plan extends it)

**Predecessor:** `docs/superpowers/plans/2026-04-20-milestone-c-batson-analysis-and-polish.md` (tagged `milestone-c`)

---

## File structure additions

```
src/
├── types/
│   ├── case.ts                       MODIFIED — add reactions, venireSize, seatLayout, strikePriority
│   └── schema.ts                     MODIFIED — bump to 2
├── db/
│   └── migrations.ts                 MODIFIED — add v1→v2 migration
├── content/
│   ├── analogies.ts                  NEW — typed static content for 6 analogies
│   └── questioning-trees.ts          NEW — LE bias + social pressure trees
├── components/
│   ├── AnalogyLibrary.tsx            NEW — browse/pick an analogy
│   ├── AnalogyPrompter.tsx           NEW — walk through an analogy with checkpoints
│   ├── ReactionLog.tsx               NEW — freeform reactions on a juror
│   ├── StrikePriorityRing.tsx        NEW — halo overlay on seat card
│   └── SeatGrid.tsx                  MODIFIED — support venireSize + snake layout + strike-priority ring
├── screens/
│   ├── CaseSetup.tsx                 MODIFIED — venire size + layout selectors
│   ├── Questioning.tsx               MODIFIED — analogy button in drawer + reactions tab
│   └── Decision.tsx                  MODIFIED — strike-priority ring visible
├── lib/
│   ├── fisher.ts                     NEW — Fisher's exact test
│   ├── fisher.test.ts                NEW
│   └── batson-analysis.ts            MODIFIED — use Fisher's exact for pattern flags
└── docs/
    └── CHECKLIST-milestone-d.md      NEW
```

---

## Task list

Each task = full code + self-verification + atomic commit. Subagent prompts deliver exact code when dispatched.

### Phase 1 — Data model & migration

**Task 1: Extend types + bump schema + v1→v2 migration**
- `Juror.reactions: ReactionEntry[]` — `{ at, kind: 'behavior'|'analogy-response', note, analogyId?, checkpointId?, response?: 'yes'|'no'|'hesitant' }`
- `Juror.strikePriority: 0|1|2|3|4|5` — 0 = unranked, 5 = strike first
- `CaseMeta.venireSize: number` — default 21
- `CaseMeta.seatLayout: 'rows' | 'snake'` — default 'rows'
- `CURRENT_SCHEMA_VERSION = 2`
- Migration v1→v2 backfills defaults on load.
- Tests: schema migration round-trips v1 fixture, v2 loads unchanged.

### Phase 2 — Analogy repository

**Task 2: Analogy content module**
- Static data at `src/content/analogies.ts`: 6 analogies (Skydiving/Red String, Tylenol/Cyanide, Pilot & Plane, Cookie Jar, LE Bias tree, Unfair Contest, Social Pressure) each with `id`, `title`, `topic` (burden-of-proof / circumstantial / LE-bias / silence / social-pressure), `steps[]` where each step has `attorney_prompt: string`, `checkpoint?: { id, question, options: ('yes'|'no'|'hesitant')[] }`.
- Pure TypeScript, fully tested with sample structural assertions.

**Task 3: AnalogyLibrary component**
- Modal-style picker: grouped by topic. Click an analogy → returns `analogyId` to parent.
- Accessible from a button on every juror drawer (Questioning mode only; Decision mode makes notes read-only).

**Task 4: AnalogyPrompter component**
- Given `analogyId` + current juror, renders a step-by-step walkthrough:
  - Large attorney-facing prompt text
  - Spotter checkpoint buttons (yes/no/hesitant) per step
  - Next/previous navigation
  - On checkpoint click: append `ReactionEntry { kind: 'analogy-response', analogyId, checkpointId, response }` to juror via `updateCase`
  - "Finish" closes the prompter.
- Full code spec in task dispatch.

**Task 5: Wire analogy button into JurorDrawer**
- Add a "Walk through an analogy…" button in the drawer (Questioning mode only).
- Button opens AnalogyLibrary; selection opens AnalogyPrompter.

**Task 6: AnalogyReport view — juror-level**
- At the bottom of the juror drawer, render a compact summary of past analogy responses for this juror.

**Task 7: AnalogyReport view — case-level**
- New screen at `/cases/:caseId/analogies` showing a cross-juror matrix: rows = jurors, columns = analogies delivered, cells = yes/no/hesitant badges. Accessible from a link in the Questioning or Decision header.

### Phase 3 — Reaction log

**Task 8: Reaction log UI in juror drawer**
- Freeform reactions: `ReactionEntry { kind: 'behavior', at, note }`.
- "Add reaction" input + list of past reactions with timestamps.
- Accessible in both Questioning and Decision modes (reactions editable even after questioning ends — this is behavioral observation, not juror note).

### Phase 4 — Venire size + layout

**Task 9: Parameterize SeatGrid (venireSize)**
- SeatGrid takes `venireSize` prop (default 21).
- Grid re-flows based on size: keep 7-wide rows for 21; configurable columns for other sizes.

**Task 10: Case Setup — venire size selector**
- Presets: 6, 12, 21 (LA default), 60, Custom.
- Persists to `caseMeta.venireSize`.
- Questioning screen uses `activeCase.meta.venireSize` instead of hardcoded 21.
- Updates `advanceToDecision` validation: requires `venireSize` named seats, not `21`.

**Task 11: Snake seating layout**
- Case Setup option: layout `rows` (default) or `snake` (alternating-direction rows).
- SeatGrid renders snake flow if selected: row 1 left→right, row 2 right→left, row 3 left→right.
- Seat numbers follow the snake path (1–N in reading order after reflow).

### Phase 5 — Color halos + strike priority

**Task 12: StrikePriority ring on SeatCard**
- Add 0–5 dot/ring indicator visible in Decision mode.
- Click ring → dropdown to set priority.
- Ring color: 5 = red-700 outer glow, 1 = amber, 0 = invisible.

### Phase 6 — Fisher's exact test for Batson alerts

**Task 13: `src/lib/fisher.ts` — Fisher's exact test (two-tailed, 2x2)**
- Pure function: `fisherExact2x2(a, b, c, d) → { pTwoTailed, pLeftTail, pRightTail }`.
- Implemented via log-gamma hypergeometric CDF.
- Tests: known 2x2 tables, edge cases (zeros, small N).

**Task 14: Integrate into batsonPatternFlags**
- For each (side, race) pair, compute Fisher's exact with table:
  - [strikes-of-race-by-side, strikes-of-other-races-by-side,
     remaining-venire-of-race, remaining-venire-of-other-races]
- Add alert if `pTwoTailed < 0.05` AND strikes-of-race-by-side ≥ 2.
- Keep existing 80% threshold + prima-facie flag as complementary signals.
- New `PatternFlag` entries carry the p-value in the message.

### Phase 7 — Help + close-out

**Task 15: Help screen updates**
- Add a section on Apple Pencil / iPadOS Scribble (no setup required, just handwrite in any text field).
- Add a short overview of the analogy library with example workflow.
- Add Strike Priority ring explanation.

**Task 16: Milestone D checklist + tag**
- Run typecheck, tests, E2E, build.
- Write `docs/CHECKLIST-milestone-d.md`.
- Commit + tag `milestone-d`.

---

## Self-review

**Spec coverage (against the features-doc buckets I agreed to build):**

| Doc feature | Task |
|---|---|
| Analogy library + prompts | Tasks 2–7 |
| Reaction tracking per juror | Task 8 |
| Configurable venire size | Tasks 9, 10 |
| Snake seating | Task 11 |
| Strike priority ring (color halo) | Task 12 |
| Fisher's-exact Batson reinforcement | Tasks 13, 14 |
| Apple Pencil documentation | Task 15 |

**Explicitly deferred (flagged in my recommendation, user accepted):**
- OSINT / social media scraping
- AI/NLP Big Five psychographic profiling
- Cross-case prosecutor strike history
- Real-time multi-user spotter/presenter sync
- Questionnaire OCR (could revisit as a Milestone E feature, client-side via Tesseract.js)

**Placeholder scan:** No TBD/TODO/FIXME in the plan. Task dispatches carry full code.

**Type consistency:**
- `ReactionEntry` shape used by Tasks 1, 2, 4, 8 — consistent.
- `strikePriority: 0|1|2|3|4|5` literal union in Task 1 → consumed by Task 12.
- `venireSize: number` in Task 1 → consumed by Tasks 9, 10; migration backfills to 21.
- Fisher's exact result shape in Task 13 → consumed by Task 14.
