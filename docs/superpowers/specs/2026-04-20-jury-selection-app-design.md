# Jury Selection App — Design

**Date:** 2026-04-20
**Status:** Design approved, pending implementation plan
**Author:** cjw@danielswashington.com
**Target use:** Live voir dire in Louisiana criminal trials

---

## 1. Overview

A single-user, offline-first Progressive Web App that replaces the paper juror note card during Louisiana criminal voir dire. It supports the full live workflow: questioning a 21-person panel, making strike decisions with live *Batson* tracking, and assembling the final seated jury across multiple panels. It also produces a PDF record suitable for the trial file and appellate record.

## 2. Goals

1. Digital replacement for the classic paper juror card, laid out to mirror a 3×7 jury box.
2. Fast live note-taking during questioning without slowing the attorney down.
3. Enforced voir-dire workflow: Questioning → Decision → Seated Jury, one panel at a time.
4. Live *Batson* tally and peremptory-strike tracking with documented reasons on every strike.
5. PDF export of the full record for each trial.
6. Works on both macOS laptop (prep) and iPadOS (in court), with `.jury` file handoff between devices.
7. Zero backend, zero network dependency during trial.

## 3. Non-goals (v1)

- Multi-user real-time collaboration (solo use only).
- Juror intel persistence across cases (each case is independent).
- PDF questionnaire auto-extraction (CSV/JSON paste only; AI extraction planned for v2).
- Cloud sync service (device handoff via `.jury` files + iCloud Drive/AirDrop).
- App-level PIN or biometric lock (relies on device-level encryption).
- Apple Pencil handwriting-to-ink storage (text-only via iPadOS Scribble).
- Sharing/export of aggregated juror intelligence.

## 4. Primary user and use case

**User:** Criminal defense attorney in Louisiana state court. Solo operation with occasional reference by co-counsel (read via AirDropped `.jury` file or shared PDF, not live sync).

**Primary scenario:** The attorney walks into a Louisiana district court voir dire with an iPad (or laptop). The jury commissioner provides a venire list the evening before. The attorney pastes it into the app, creating a case with the first panel of jurors pre-populated by name and juror #. In court, the attorney questions the 21-person panel, taking structured and freeform notes per juror. After release, the attorney enters Decision mode, marks strikes with required reasons, and watches the live *Batson* tally. A second panel is called if needed. Once the target of 12 jurors + alternates is reached, the app exports a full PDF record.

**Key constraints:**
- Courtroom WiFi is unreliable; app must work fully offline.
- Attention is on the venire, not the device — UI must be glanceable.
- The record matters for appeal; every action must produce a defensible audit trail.

## 5. Scope summary of decisions

| Decision | Choice |
|---|---|
| Primary use | Live in court during voir dire |
| Devices | Both macOS laptop + iPad (responsive PWA) |
| Collaboration | Solo, client-side only |
| Jury box layout | 3 rows × 7 seats = 21 |
| Strike tracking | Strike + *Batson* demographic tally |
| Card structure | Full structured fields (identity, demographics, employment, flags, views, notes) |
| Data entry | Pre-load + questionnaire import (CSV/JSON v1; AI PDF extraction v2) |
| Between trials | Persistent case list; PDF export; no juror carryover |
| Device sync | `.jury` file handoff (save-case-to-file model) |

## 6. Architecture

### 6.1 Stack

- **React 19** + **Vite** + **TypeScript**
- **Tailwind CSS v4** for styling
- **Dexie** wrapping IndexedDB for persistence
- **Zustand** for state management
- **React Router** for screen navigation
- **`vite-plugin-pwa`** for service-worker caching + installability
- **`@react-pdf/renderer`** (or equivalent) for PDF report generation
- **Vitest** for unit tests; **Playwright** for E2E

### 6.2 Runtime shape

```
Browser (PWA, offline-capable after first load)
  ├── UI (React 19 + Tailwind v4)
  ├── State (Zustand store — a view onto IndexedDB)
  ├── Persistence (Dexie / IndexedDB — case list + active case)
  │    └── Every mutation writes through in the same tick.
  │        No user-facing "save" step inside the app.
  └── File I/O — .jury files (JSON) for moving cases between devices
       ├── macOS: File System Access API (direct read/write in iCloud Drive)
       └── iPadOS: browser download + file-picker upload (via Files.app)
```

### 6.3 Delivery

- Installable PWA hosted once on Vercel/Netlify free tier.
- On macOS, install via Chrome/Edge as a desktop application.
- On iPad, install via Safari "Add to Home Screen." **Hard requirement**: un-installed Safari can evict IndexedDB under storage pressure or inactivity.
- First-run onboarding detects non-installed Safari and walks the user through install.

### 6.4 Core invariants

- **No network required in court.** App works fully offline after install.
- **Autosave on every mutation.** There is no "unsaved work" state; the Zustand store mirrors IndexedDB.
- **Schema-versioned persistence.** Every stored object and every `.jury` file carries a `schemaVersion` field; a migration function runs on load if the file is older than the app's current schema version.
- **Device-level encryption is the security boundary** for v1 (iPad passcode, FileVault). No app-level PIN; logged for v2.
- **`.jury` file = one case.** Plain JSON (gzip later if needed) with `{ schemaVersion, exportedAt, exportedBy, case: {...} }`.

## 7. Data model

### 7.1 Entity tree

```
Case
 ├── meta        name, docket #, parish, judge, trial date,
 │               targetJurors (default 12), targetAlternates (default 2),
 │               peremptoryBudget { defense, state }
 ├── mode        "questioning" | "decision" | "seated"
 ├── currentPanelIndex
 ├── Panels[]    ordered; one per 21-person batch
 │    ├── status: "questioning" | "decided" | "archived"
 │    └── Jurors[]
 │         ├── seatIndex       1..21 or null (if removed)
 │         ├── seatHistory[]   audit trail of replace-in-seat / slide-left moves
 │         ├── identity        name, jurorNumber, age, address, zip
 │         ├── demographics    race, gender, maritalStatus (M/S/D/W),
 │         │                   children, education
 │         ├── employment      employer, jobTitle, spouseEmployer, spouseJobTitle
 │         ├── flags           priorJury, crimeVictim, leFamily, leFriend,
 │         │                   arrestHx, convictionHx, hardship
 │         │                   (each: bool + optional note)
 │         ├── views           burdenOfProof, punishment, other
 │         ├── demeanor
 │         ├── notes           freeform text (Markdown-capable)
 │         ├── lean            integer -3..+3 (strongly state → strongly defense)
 │         ├── status          active | disqualified | kept |
 │         │                   struck-peremptory-defense | struck-peremptory-state |
 │         │                   struck-cause-defense | struck-cause-state |
 │         │                   excused-by-court
 │         ├── disqualificationReason  (required when status = disqualified)
 │         └── strikeReason            (required when status ≠ active and ≠ kept)
 └── seatedJurorOrder[]   ordered juror IDs forming the final Juror 1..N + Alternates
```

### 7.2 Derived values (never stored)

- **Peremptories used per side** — counted from juror statuses.
- **Batson tally** — cross-tab of each side's peremptories by race and gender.
- **Seated-jury progress** — count of `kept` jurors across panels vs. target.

### 7.3 Storage schema (Dexie / IndexedDB)

Two tables:

- **`cases`** — one row per case with index fields only: `{ id, name, status, updatedAt }`. Powers the case-list screen without loading full data.
- **`caseBlobs`** — one row per case: `{ caseId, schemaVersion, data: Case }`. Full case object as a JSON blob. Loaded once on case open; every mutation writes the blob back in the same tick.

### 7.4 `.jury` file format

```json
{
  "schemaVersion": 1,
  "exportedAt": "2026-04-20T14:32:00Z",
  "exportedBy": "jury-selection-app/0.1.0",
  "case": { /* full Case object */ }
}
```

One case per file. Plain JSON. Gzipped later if file size becomes a concern.

## 8. Screens and mode flow

### 8.1 Navigation

```
[Home / Case List]
     │
     ├── New Case → [Case Setup] ──┐
     │                             ▼
     └── Open Case ────────▶ [Active Case]
                                   │
                  ┌────────────────┼─────────────────┬──────────────────┐
                  ▼                ▼                 ▼                  ▼
        [Questioning Mode] [Decision Mode]    [Seated Jury]     [Batson Analysis]
                                   │                 │                  │
                       [Peremptory Tracker] ─────────┴──────────────────┘
                                   │
                            [PDF Report Export]
```

### 8.2 Screens

**Home / Case List.** Left rail: New Case, Open `.jury` File, Install PWA (iPad first-run guide). Main pane: card list of cases (active on top, archived collapsed). Each row: caption, docket #, trial date, last mode, last edited.

**Case Setup.** One-screen form: name, docket #, parish, judge, trial date, targetJurors (default 12), targetAlternates (default 2), peremptoryBudget per side (presets + custom). Defaults reflect LSA-C.Cr.P. art. 799:

- *Capital:* 12 per side
- *Felony (12-juror trial):* 12 per side
- *Felony (6-juror trial):* 6 per side
- *Custom:* user-set

(Misdemeanors in Louisiana are tried by judge alone, not jury, so no preset is provided for them.)

Optional "Import venire list" CSV/JSON paste pane at the bottom — creates the first panel's jurors up front if populated.

**Questioning Mode.** Main pane: 3×7 seating chart. Each seat renders a juror summary (name, job, M/S/D/W, lean thermometer, flag chips). Tap seat → juror detail drawer slides in from the right with structured fields + notes. Mid-panel disqualification action in the drawer opens a modal: "Replace in seat" (default) or "Slide left." Requires `strikeReason` text. Header shows panel number, questioning progress, and "Finish Questioning → Decision Mode" button (disabled until every seat has at least a name).

**Decision Mode.** Same 3×7 chart; tap opens a strike picker (Keep / Peremptory-Defense / Peremptory-State / Cause-Defense / Cause-State / Excused by court). Every non-keep choice requires a `strikeReason`. Right rail shows the Peremptory Tracker (persistent). Header shows the live *Batson* tally. Lean rating visible as seat color overlay. "Finish Decisions → Next Panel" or "Finish Decisions → Seated Jury" when `targetJurors + targetAlternates` met. **Juror notes and structured fields are read-only once a panel enters Decision mode**; only `strikeReason` and strike status can change.

**Peremptory Tracker.** Persistent right-rail column in Decision Mode; also accessible as a full-screen view from the case menu. Two side-by-side panels (Defense / State), each showing budget used, unused slots as empty boxes, and every used slot with juror name, seat + panel, and strike reason. Warning banner at 10 of 12 used; red alert at budget max.

**Batson Analysis.** Dedicated screen (also from Decision Mode). Sections:
1. *Cross-tab summary* — strikes by side × race × gender.
2. *Strike log* — chronological list of every peremptory with juror demographics, reason, and timestamp. Sortable.
3. *Disparate-treatment helper* — for any struck juror, lists *kept* jurors of a different race sharing one or more characteristics (flags, views, employment type). Surfaces the "State struck X for reason Y but kept Z who answered the same" argument.
4. *Pattern flags* — live alerts at common thresholds ("State has used 4 of 5 peremptories against Black jurors — prima facie *Batson* case likely established").
5. *Export* — "Generate *Batson* motion draft" button producing a pre-populated Word/PDF draft with the tally, strikes, comparators, and stated reasons.

**Seated Jury.** Running list of `kept` jurors across all panels, drag-ordered into Juror 1..N + Alternate 1..M. Panel summary chips above. "Export PDF Report" button.

**PDF Report.** Rendered in-browser via `@react-pdf/renderer`. Contents: case header, per-panel seating chart snapshot, every juror's card (identity, demographics, lean, notes, disposition, strike reason), *Batson* tally summary, final seated jury list.

**Utility.** Save / Open `.jury` file (`Cmd/Ctrl+S`, `Cmd/Ctrl+O`), settings (reset case list, view schema migration log), help (pre-trial checklist + shortcuts reference).

### 8.3 Mode enforcement rules

- Once a panel enters **Decision**, its juror identity/notes fields become read-only; only strike status and reason remain editable.
- Once a panel is **decided**, it cannot be re-opened for questioning (it is viewable in read-only form on the Case Detail screen).
- **Seated Jury** mode activates when total `kept` across panels ≥ `targetJurors + targetAlternates`.
- Within a single panel, mode advance is one-way. A new panel is appended in Questioning mode.

### 8.4 Input affordances

**Laptop keyboard shortcuts**

- `Tab` / `Shift+Tab` — cycle through seats
- `1`..`7` — quick-set lean rating on the focused seat; keys map to stored values as: `1`→−3, `2`→−2, `3`→−1, `4`→0, `5`→+1, `6`→+2, `7`→+3 (i.e., key `1` = strongly state, key `4` = neutral, key `7` = strongly defense)
- `V` — toggle crime-Victim flag
- `L` — toggle LE family flag
- `P` — toggle Prior jury flag
- `Cmd/Ctrl+S` — save current case to `.jury` file
- In Decision mode: `K` keep; `D` peremptory-defense; `S` peremptory-state; `C` cause (prompts side)

**iPad gestures**

- Tap-and-hold a seat → quick action menu (set lean, flags, strike)
- Apple Pencil in notes field → handwriting-to-text via iPadOS Scribble (built in, free)

## 9. Data flow, reliability, error handling

### 9.1 Data flow

```
User interaction  →  Zustand action  →  Dexie transaction  →  IndexedDB
                              ↑                                    │
                              └──────────── reload/rehydrate ───────┘
```

Every mutation goes through a single `updateCase(mutator)` function that (a) applies the change to the in-memory store, (b) commits it to IndexedDB in the same microtask, and (c) sets `updatedAt`. The UI only renders what's already in the store (no optimistic UI).

On macOS, when a case was opened from a `.jury` file via File System Access API, the app debounce-writes the file back every 10 seconds and on every mode transition. iPadOS cannot do this; iPad users "Save Case" manually before leaving the device (reminder banner at end-of-day / mode transitions).

### 9.2 Error handling

- **Storage failure (IndexedDB write error):** Toast with message and a red "Export Now" button that triggers an immediate `.jury` download. Logged locally.
- **Schema mismatch on file open:** Older schema → run migration; show one-line notice. Newer schema → block load with "Update app before opening."
- **Quota exhaustion on iPad:** `navigator.storage.estimate()` checked before case creation; warn at > 80 % usage with guidance to archive or clear cache.
- **Concurrent edit (same case open in two tabs):** On `visibilitychange` to visible, reload from IndexedDB and show a banner if the blob changed. Last-writer-wins.
- **Accidental navigation:** `beforeunload` prompt during Questioning or Decision mode if an in-flight write is pending (rare given the write-through model).
- **Crash recovery:** On app load, detect unclean shutdown and offer "Resume last session." IndexedDB state is already correct; this is a UX convenience.

### 9.3 Reliability commitments

- **No data loss on a single crash** — IndexedDB writes are transactional; at most the in-flight keystroke is lost.
- **No data loss on iPad storage eviction** — mitigated by required PWA install + quota monitoring; documented in onboarding.
- **Pre-trial dry-run checklist** — ships in Help screen. Attorney runs it the night before trial: open fresh case, load test venire, run one panel end-to-end, export PDF, save + reopen `.jury` file.

## 10. Testing

### 10.1 Unit tests (Vitest)

- Mode-transition rules (every legal transition allowed; every illegal transition blocked).
- Strike invariants (budget not exceeded; `strikeReason` required; target count reached exactly).
- *Batson* tally math (cross-tab totals match; disparate-treatment comparator finds expected matches).
- Mid-panel disqualification (replace-in-seat preserves indices; slide-left shifts correctly; `seatHistory` records moves).
- Schema migrations (each version step round-trips a fixture file).
- CSV/JSON venire import (malformed inputs produce clear errors, not crashes).

### 10.2 Integration tests (Playwright)

1. **Happy path voir dire** — Create case, import venire CSV, complete Questioning on panel 1, enter Decision mode, mark 4 peremptories + 2 cause + rest kept, advance to Seated Jury, export PDF. Verify PDF contents.
2. **Multi-panel flow** — Kept count = 8 after panel 1; app forces new panel; complete panel 2 to fill remainder; verify Seated Jury pulls from both panels correctly.

### 10.3 Manual pre-trial checklist (shipped in Help)

- [ ] Open app on trial device; confirm PWA install.
- [ ] Create throwaway test case; run 21 fake jurors through full flow.
- [ ] Export test PDF; open on same device.
- [ ] Save `.jury` to iCloud Drive; reopen on second device.
- [ ] Confirm Peremptory Tracker and Batson Analysis screens render.
- [ ] Delete test case.

### 10.4 Out of scope for v1

- PDF pixel-accuracy E2E (verified manually).
- Load/performance tests (small data volume).
- Cross-browser matrix beyond Safari (iPad) and Chrome/Edge (macOS).

## 11. Backlog / future enhancements

- App-level PIN or Face ID lock.
- PDF questionnaire auto-extraction via Claude API (requires lightweight backend proxy or File System Access-based key storage).
- Real-time co-counsel sync (backend tier — Supabase or Firebase).
- Cross-case juror intelligence database.
- Customizable *Batson* alert thresholds.
- Linked *Batson* motion templates via the `dw-pretrial-motion-library` skill.
- Automated comparator scoring (weighted similarity across juror fields).
- Voice dictation for notes (iPadOS / macOS built-in dictation is already available; no app work needed unless custom vocabulary is desired).

## 12. Glossary (Louisiana criminal voir dire)

- **Venire** — pool of prospective jurors summoned for jury service.
- **Panel** — a group of jurors (here, 21) seated in the jury box for questioning as a batch.
- **Peremptory strike** — removal of a juror without stating cause, limited by statute (commonly 12 per side in felony cases; varies by offense class under LSA-C.Cr.P. art. 799).
- **Challenge for cause** — removal of a juror for stated legal reason (bias, relation to party, etc.); no limit.
- **Excused by court** — juror removed by the judge (hardship, illness, disqualification) without using a side's peremptory.
- **Batson challenge** — objection that an opposing party is using peremptory strikes in a racially (or gender-) discriminatory pattern, per *Batson v. Kentucky*, 476 U.S. 79 (1986). Requires a prima facie showing; burden then shifts to the striking party to offer a race-neutral explanation; court makes the final pretext determination.
- **Replace in seat** — when a juror is disqualified mid-panel, a new venire member fills the same seat number.
- **Slide left** — less common alternative: remaining jurors shift left to close the gap, with a new juror seated at the end of the row.
