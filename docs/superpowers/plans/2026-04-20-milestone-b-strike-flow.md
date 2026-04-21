# Jury Selection App — Milestone B: Strike flow + export

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Decision mode (strike picker with required reasons + live Batson tally + Peremptory Tracker), multi-panel flow, Seated Jury view, PDF report export, and `.jury` file save/open for device handoff. At milestone close, the attorney can run a full voir dire end-to-end: questioning → strikes → seated jury → PDF record, and can move a case between an iPad and a laptop via `.jury` files.

**Architecture:** Build strictly on the Milestone A schema — no migrations required. The existing `Juror.status` enum already contains every strike state; `Case.mode` already encodes `questioning | decision | seated`; `Case.seatedJurorOrder` already exists. New code lives in focused modules: strike/Batson computation, file I/O, and three new screens (Decision, Seated Jury, PDF preview).

**Tech Stack:** React 19, Vite 6, TypeScript 5, Tailwind v4, Dexie, Zustand, React Router v6, `@react-pdf/renderer`, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-04-20-jury-selection-app-design.md`

**Predecessor milestone:** `docs/superpowers/plans/2026-04-20-milestone-a-foundation.md` (tagged `milestone-a`)

---

## File structure at end of Milestone B

New files (additions only; no restructuring of Milestone A code):

```
Jury Selection/
├── src/
│   ├── lib/
│   │   ├── strike.ts              NEW — strike state helpers and counts
│   │   ├── strike.test.ts         NEW
│   │   ├── batson.ts              NEW — live Batson tally computation
│   │   ├── batson.test.ts         NEW
│   │   ├── juryfile.ts            NEW — .jury file serialize/deserialize
│   │   ├── juryfile.test.ts       NEW
│   │   └── files.ts               NEW — File System Access API wrapper + fallback
│   ├── components/
│   │   ├── StrikePicker.tsx       NEW — modal: keep / peremptory / cause / excused
│   │   ├── PeremptoryTracker.tsx  NEW — rail + full-screen variants
│   │   └── BatsonTallyHeader.tsx  NEW — live in Decision header
│   ├── screens/
│   │   ├── Decision.tsx           NEW
│   │   ├── SeatedJury.tsx         NEW
│   │   ├── PeremptoryTrackerScreen.tsx NEW — full-screen wrapper
│   │   └── PdfPreview.tsx         NEW — rendered + download
│   ├── pdf/
│   │   └── JuryReportDocument.tsx NEW — @react-pdf/renderer document
│   ├── hooks/
│   │   └── useFileShortcuts.ts    NEW — Cmd/Ctrl+S, Cmd/Ctrl+O
│   ├── db/
│   │   └── repository.ts          MODIFIED — advanceToDecision, finishDecisions,
│   │                                         startNextPanel helpers
│   ├── screens/
│   │   ├── CaseList.tsx           MODIFIED — "Open .jury File" entry
│   │   └── Questioning.tsx        MODIFIED — "Finish Questioning" wires to real transition
│   └── routes.tsx                 MODIFIED — add /cases/:caseId/{decision,seated,tracker,report}
└── docs/
    └── CHECKLIST-milestone-b.md   NEW
```

No schema changes — `schemaVersion` stays at 1.

---

## Phase 1 — Strike flow infrastructure

### Task 1: Strike state helpers

**Files:**
- Create: `src/lib/strike.ts`
- Create: `src/lib/strike.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/strike.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  isStruck,
  isEligibleForStrike,
  peremptoryCounts,
  countByStatus,
  PEREMPTORY_STATUSES,
  CAUSE_STATUSES,
} from './strike';
import type { Juror } from '../types/case';
import { makeEmptyJuror } from './panel';

function j(overrides: Partial<Juror> = {}): Juror {
  return { ...makeEmptyJuror('p'), ...overrides };
}

describe('isStruck', () => {
  it('is true for any non-active, non-kept status', () => {
    expect(isStruck(j({ status: 'struck-peremptory-defense' }))).toBe(true);
    expect(isStruck(j({ status: 'struck-cause-state' }))).toBe(true);
    expect(isStruck(j({ status: 'excused-by-court' }))).toBe(true);
    expect(isStruck(j({ status: 'disqualified' }))).toBe(true);
  });
  it('is false for active and kept', () => {
    expect(isStruck(j({ status: 'active' }))).toBe(false);
    expect(isStruck(j({ status: 'kept' }))).toBe(false);
  });
});

describe('isEligibleForStrike', () => {
  it('is true only for active, seated jurors', () => {
    expect(isEligibleForStrike(j({ status: 'active', seatIndex: 1 }))).toBe(true);
    expect(isEligibleForStrike(j({ status: 'active', seatIndex: null }))).toBe(
      false
    );
    expect(isEligibleForStrike(j({ status: 'kept', seatIndex: 1 }))).toBe(false);
    expect(
      isEligibleForStrike(j({ status: 'disqualified', seatIndex: null }))
    ).toBe(false);
  });
});

describe('peremptoryCounts', () => {
  it('counts defense and state peremptories across jurors', () => {
    const jurors = [
      j({ status: 'struck-peremptory-defense' }),
      j({ status: 'struck-peremptory-defense' }),
      j({ status: 'struck-peremptory-state' }),
      j({ status: 'struck-cause-state' }),
      j({ status: 'kept' }),
    ];
    expect(peremptoryCounts(jurors)).toEqual({ defense: 2, state: 1 });
  });
});

describe('countByStatus', () => {
  it('tallies each status', () => {
    const jurors = [
      j({ status: 'active' }),
      j({ status: 'active' }),
      j({ status: 'kept' }),
      j({ status: 'struck-peremptory-defense' }),
    ];
    const t = countByStatus(jurors);
    expect(t.active).toBe(2);
    expect(t.kept).toBe(1);
    expect(t['struck-peremptory-defense']).toBe(1);
  });
});

describe('constants', () => {
  it('PEREMPTORY_STATUSES lists both peremptory statuses', () => {
    expect(PEREMPTORY_STATUSES).toContain('struck-peremptory-defense');
    expect(PEREMPTORY_STATUSES).toContain('struck-peremptory-state');
    expect(PEREMPTORY_STATUSES).toHaveLength(2);
  });
  it('CAUSE_STATUSES lists both cause statuses', () => {
    expect(CAUSE_STATUSES).toContain('struck-cause-defense');
    expect(CAUSE_STATUSES).toContain('struck-cause-state');
    expect(CAUSE_STATUSES).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run:
```bash
cd "/Users/greatelephant82/Library/Mobile Documents/com~apple~CloudDocs/Claude Software Developer/Jury Selection"
npm test -- strike
```
Expected: FAIL — module not defined.

- [ ] **Step 3: Implement `src/lib/strike.ts`**

```ts
import type { Juror, JurorStatus } from '../types/case';

export const PEREMPTORY_STATUSES = [
  'struck-peremptory-defense',
  'struck-peremptory-state',
] as const satisfies readonly JurorStatus[];

export const CAUSE_STATUSES = [
  'struck-cause-defense',
  'struck-cause-state',
] as const satisfies readonly JurorStatus[];

export const STRIKE_STATUSES = [
  ...PEREMPTORY_STATUSES,
  ...CAUSE_STATUSES,
  'excused-by-court',
  'disqualified',
] as const satisfies readonly JurorStatus[];

export function isStruck(j: Juror): boolean {
  return (STRIKE_STATUSES as readonly JurorStatus[]).includes(j.status);
}

export function isEligibleForStrike(j: Juror): boolean {
  return j.status === 'active' && j.seatIndex != null;
}

export interface PeremptoryCount {
  defense: number;
  state: number;
}

export function peremptoryCounts(jurors: Juror[]): PeremptoryCount {
  let defense = 0;
  let state = 0;
  for (const j of jurors) {
    if (j.status === 'struck-peremptory-defense') defense++;
    else if (j.status === 'struck-peremptory-state') state++;
  }
  return { defense, state };
}

export type StatusTally = Record<JurorStatus, number>;

export function countByStatus(jurors: Juror[]): StatusTally {
  const t: StatusTally = {
    active: 0,
    disqualified: 0,
    kept: 0,
    'struck-peremptory-defense': 0,
    'struck-peremptory-state': 0,
    'struck-cause-defense': 0,
    'struck-cause-state': 0,
    'excused-by-court': 0,
  };
  for (const j of jurors) t[j.status]++;
  return t;
}
```

- [ ] **Step 4: Re-run tests**

Run:
```bash
npm test -- strike
```
Expected: PASS (7+ test assertions across 5 `it` blocks).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: strike state helpers and peremptory counts"
```

---

### Task 2: Mode transition helpers in the repository

**Files:**
- Modify: `src/db/repository.ts`
- Create: `src/db/repository.modes.test.ts`

- [ ] **Step 1: Write failing tests**

`src/db/repository.modes.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import {
  createCase,
  getCase,
  populateFirstPanelFromVenire,
  advanceToDecision,
  startNextPanel,
  markJurorStrike,
  finishDecisionsForPanel,
  seatedJurors,
} from './repository';

async function reset() {
  await db.delete();
  await db.open();
}
beforeEach(reset);

async function fullPanelCase() {
  const c = await createCase({ name: 'Test' });
  await populateFirstPanelFromVenire(
    c.id,
    Array.from({ length: 21 }).map((_, i) => ({ name: `J${i + 1}` }))
  );
  return c.id;
}

describe('advanceToDecision', () => {
  it('flips case.mode to decision and panel.status to decided=false for now', async () => {
    const id = await fullPanelCase();
    await advanceToDecision(id);
    const c = await getCase(id);
    expect(c?.mode).toBe('decision');
    expect(c?.panels[0].status).toBe('questioning'); // still questioning structurally — status flips when finished
  });

  it('throws when not all 21 seats have a name', async () => {
    const c = await createCase({ name: 'Short' });
    await expect(advanceToDecision(c.id)).rejects.toThrow(
      /21 named seats/i
    );
  });
});

describe('markJurorStrike', () => {
  it('sets the juror status and strike reason', async () => {
    const id = await fullPanelCase();
    await advanceToDecision(id);
    const c1 = (await getCase(id))!;
    const jurorId = c1.panels[0].jurors[0].id;

    await markJurorStrike(id, jurorId, {
      status: 'struck-peremptory-defense',
      reason: 'prior LE family ties',
    });

    const c2 = (await getCase(id))!;
    const j = c2.panels[0].jurors.find((x) => x.id === jurorId)!;
    expect(j.status).toBe('struck-peremptory-defense');
    expect(j.strikeReason).toBe('prior LE family ties');
  });

  it('requires a reason for non-keep statuses', async () => {
    const id = await fullPanelCase();
    await advanceToDecision(id);
    const c1 = (await getCase(id))!;
    const jurorId = c1.panels[0].jurors[0].id;
    await expect(
      markJurorStrike(id, jurorId, {
        status: 'struck-cause-defense',
        reason: '',
      })
    ).rejects.toThrow(/reason is required/i);
  });

  it('allows status=kept with no reason', async () => {
    const id = await fullPanelCase();
    await advanceToDecision(id);
    const c1 = (await getCase(id))!;
    const jurorId = c1.panels[0].jurors[0].id;
    await markJurorStrike(id, jurorId, { status: 'kept', reason: '' });
    const c2 = (await getCase(id))!;
    const j = c2.panels[0].jurors.find((x) => x.id === jurorId)!;
    expect(j.status).toBe('kept');
  });
});

describe('finishDecisionsForPanel', () => {
  it('marks the current panel decided and flips mode to seated when kept count >= target', async () => {
    const id = await fullPanelCase();
    await advanceToDecision(id);
    let c = (await getCase(id))!;
    const jurors = c.panels[0].jurors;
    // Keep 14 (meets target 12 + 2 alternates default), strike the rest
    for (let i = 0; i < 14; i++) {
      await markJurorStrike(id, jurors[i].id, { status: 'kept', reason: '' });
    }
    for (let i = 14; i < 21; i++) {
      await markJurorStrike(id, jurors[i].id, {
        status: 'struck-peremptory-defense',
        reason: 'x',
      });
    }

    await finishDecisionsForPanel(id);

    c = (await getCase(id))!;
    expect(c.panels[0].status).toBe('decided');
    expect(c.mode).toBe('seated');
    expect(seatedJurors(c).length).toBe(14);
  });

  it('throws when some seated juror still has status=active', async () => {
    const id = await fullPanelCase();
    await advanceToDecision(id);
    await expect(finishDecisionsForPanel(id)).rejects.toThrow(
      /undecided juror/i
    );
  });
});

describe('startNextPanel', () => {
  it('appends a new questioning panel and resets mode', async () => {
    const id = await fullPanelCase();
    await advanceToDecision(id);
    const c1 = (await getCase(id))!;
    const jurors = c1.panels[0].jurors;
    // Keep 8 (not enough for 14), strike the rest
    for (let i = 0; i < 8; i++) {
      await markJurorStrike(id, jurors[i].id, { status: 'kept', reason: '' });
    }
    for (let i = 8; i < 21; i++) {
      await markJurorStrike(id, jurors[i].id, {
        status: 'struck-cause-defense',
        reason: 'y',
      });
    }
    await finishDecisionsForPanel(id); // panel 1 decided, not enough kept
    const mid = (await getCase(id))!;
    expect(mid.mode).toBe('decision'); // still in decision because not enough kept
    expect(mid.panels[0].status).toBe('decided');

    await startNextPanel(id);
    const c2 = (await getCase(id))!;
    expect(c2.panels.length).toBe(2);
    expect(c2.panels[1].status).toBe('questioning');
    expect(c2.mode).toBe('questioning');
    expect(c2.currentPanelIndex).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- repository.modes
```
Expected: FAIL — the new functions aren't defined.

- [ ] **Step 3: Extend `src/db/repository.ts`**

Append these exports (keep existing exports intact):

```ts
import type { JurorStatus } from '../types/case';

export async function advanceToDecision(caseId: string): Promise<void> {
  const c = await getCase(caseId);
  if (!c) throw new Error(`Case ${caseId} not found`);
  const panel = c.panels[c.currentPanelIndex];
  const seated = panel.jurors.filter(
    (j) => j.seatIndex != null && (j.identity.name ?? '').trim()
  );
  if (seated.length !== 21) {
    throw new Error('Panel must have 21 named seats before advancing to Decision.');
  }
  c.mode = 'decision';
  await saveCase(c);
}

export interface StrikeInput {
  status: JurorStatus;
  reason: string;
}

export async function markJurorStrike(
  caseId: string,
  jurorId: string,
  input: StrikeInput
): Promise<void> {
  const c = await getCase(caseId);
  if (!c) throw new Error(`Case ${caseId} not found`);

  if (input.status !== 'kept' && input.status !== 'active') {
    if (!input.reason.trim()) {
      throw new Error('A reason is required for every strike or disqualification.');
    }
  }

  const panel = c.panels[c.currentPanelIndex];
  const juror = panel.jurors.find((j) => j.id === jurorId);
  if (!juror) throw new Error(`Juror ${jurorId} not found in current panel`);

  juror.status = input.status;
  juror.strikeReason = input.reason.trim() || undefined;
  juror.updatedAt = new Date().toISOString();
  await saveCase(c);
}

export async function finishDecisionsForPanel(caseId: string): Promise<void> {
  const c = await getCase(caseId);
  if (!c) throw new Error(`Case ${caseId} not found`);
  const panel = c.panels[c.currentPanelIndex];
  const undecided = panel.jurors.filter(
    (j) => j.status === 'active' && j.seatIndex != null
  );
  if (undecided.length > 0) {
    throw new Error(
      `Cannot finish decisions — ${undecided.length} undecided juror(s) remain.`
    );
  }
  panel.status = 'decided';
  panel.decidedAt = new Date().toISOString();

  // Rebuild seatedJurorOrder from all panels in juror creation order
  const seated = c.panels.flatMap((p) =>
    p.jurors.filter((j) => j.status === 'kept').map((j) => j.id)
  );
  c.seatedJurorOrder = seated;

  const target = c.meta.targetJurors + c.meta.targetAlternates;
  if (seated.length >= target) {
    c.mode = 'seated';
  } else {
    // Stay in decision mode so the user can start the next panel
    c.mode = 'decision';
  }
  await saveCase(c);
}

export async function startNextPanel(caseId: string): Promise<void> {
  const c = await getCase(caseId);
  if (!c) throw new Error(`Case ${caseId} not found`);
  const panel = c.panels[c.currentPanelIndex];
  if (panel.status !== 'decided') {
    throw new Error('Current panel must be decided before starting a new one.');
  }
  const next: Panel = {
    id: newId(),
    index: c.panels.length + 1,
    status: 'questioning',
    jurors: [],
    createdAt: new Date().toISOString(),
  };
  c.panels.push(next);
  c.currentPanelIndex = c.panels.length - 1;
  c.mode = 'questioning';
  await saveCase(c);
}

export function seatedJurors(c: import('../types/case').Case): import('../types/case').Juror[] {
  return c.panels.flatMap((p) =>
    p.jurors.filter((j) => j.status === 'kept')
  );
}
```

- [ ] **Step 4: Re-run tests**

```bash
npm test -- repository.modes
npm test
```
Expected: `repository.modes` PASS (7 assertions across 7 `it` blocks). Full test suite still green (26 + new = 33).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: mode transition helpers (advance/finish/next-panel/strike)"
```

---

## Phase 2 — Decision Mode UI

### Task 3: StrikePicker modal

**Files:**
- Create: `src/components/StrikePicker.tsx`

- [ ] **Step 1: Implement the component**

`src/components/StrikePicker.tsx`:
```tsx
import { useState } from 'react';
import type { JurorStatus } from '../types/case';

export type StrikeChoice =
  | 'kept'
  | 'struck-peremptory-defense'
  | 'struck-peremptory-state'
  | 'struck-cause-defense'
  | 'struck-cause-state'
  | 'excused-by-court';

interface Props {
  jurorName: string;
  currentStatus: JurorStatus;
  currentReason?: string;
  onCancel: () => void;
  onConfirm: (status: StrikeChoice, reason: string) => void;
}

const OPTIONS: { value: StrikeChoice; label: string; hint?: string }[] = [
  { value: 'kept', label: 'Keep', hint: 'Juror stays in the box' },
  {
    value: 'struck-peremptory-defense',
    label: 'Peremptory — Defense',
    hint: 'Counts against defense budget',
  },
  {
    value: 'struck-peremptory-state',
    label: 'Peremptory — State',
    hint: 'Counts against state budget',
  },
  {
    value: 'struck-cause-defense',
    label: 'Cause — Defense',
    hint: 'Unlimited; challenge sustained',
  },
  {
    value: 'struck-cause-state',
    label: 'Cause — State',
    hint: 'Unlimited; challenge sustained',
  },
  {
    value: 'excused-by-court',
    label: 'Excused by court',
    hint: 'Hardship, disqualification, etc.',
  },
];

export default function StrikePicker({
  jurorName,
  currentStatus,
  currentReason,
  onCancel,
  onConfirm,
}: Props) {
  const initial: StrikeChoice =
    currentStatus === 'active' ? 'kept' : (currentStatus as StrikeChoice);
  const [choice, setChoice] = useState<StrikeChoice>(initial);
  const [reason, setReason] = useState(currentReason ?? '');
  const [error, setError] = useState<string | null>(null);

  const reasonRequired = choice !== 'kept';

  function submit() {
    if (reasonRequired && !reason.trim()) {
      setError('A reason is required for every strike (for the record).');
      return;
    }
    onConfirm(choice, reason.trim());
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-md shadow-xl p-6 w-[520px] max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-1">
          Decide: {jurorName || 'juror'}
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Every non-keep decision requires a written reason. The reason is
          preserved in the record for appellate review and Batson analysis.
        </p>

        <fieldset className="grid gap-2 mb-4">
          {OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={
                'flex items-start gap-3 p-2 rounded-md border cursor-pointer ' +
                (choice === opt.value
                  ? 'border-slate-900 bg-slate-50'
                  : 'border-slate-200 hover:border-slate-400')
              }
            >
              <input
                type="radio"
                name="strike"
                className="mt-1"
                checked={choice === opt.value}
                onChange={() => setChoice(opt.value)}
              />
              <div>
                <div className="text-sm font-medium">{opt.label}</div>
                {opt.hint && (
                  <div className="text-xs text-slate-500">{opt.hint}</div>
                )}
              </div>
            </label>
          ))}
        </fieldset>

        <label className="grid gap-1 mb-4">
          <span className="text-sm font-medium">
            Reason {reasonRequired ? '(required)' : '(optional)'}
          </span>
          <textarea
            rows={3}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              reasonRequired
                ? 'Race-neutral reason — e.g., prior jury deadlock / LE family / expressed bias.'
                : 'Optional note'
            }
          />
        </label>

        {error && (
          <div role="alert" className="text-sm text-red-700 mb-2">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="px-3 py-2 text-sm rounded-md bg-slate-900 text-white hover:bg-slate-800"
          >
            Save decision
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: StrikePicker modal with required reason field"
```

---

### Task 4: Decision screen (grid, strike overlay, read-only drawer)

**Files:**
- Create: `src/screens/Decision.tsx`
- Create: `src/screens/Decision.test.tsx`
- Modify: `src/components/SeatCard.tsx` (add strike overlay)
- Modify: `src/routes.tsx` (add `/cases/:caseId/decision`)

- [ ] **Step 1: Add strike overlay to `SeatCard`**

Replace `src/components/SeatCard.tsx`:

```tsx
import type { Juror, JurorStatus } from '../types/case';

interface Props {
  seat: number;
  juror?: Juror;
  onClick?: () => void;
}

const LEAN_COLOR: Record<number, string> = {
  [-3]: 'border-l-red-700',
  [-2]: 'border-l-red-500',
  [-1]: 'border-l-red-300',
  0: 'border-l-slate-300',
  1: 'border-l-emerald-300',
  2: 'border-l-emerald-500',
  3: 'border-l-emerald-700',
};

const STATUS_BADGE: Partial<Record<JurorStatus, { label: string; klass: string }>> = {
  kept: { label: 'KEEP', klass: 'bg-emerald-100 text-emerald-800' },
  'struck-peremptory-defense': {
    label: 'PEREMPT — D',
    klass: 'bg-red-100 text-red-800',
  },
  'struck-peremptory-state': {
    label: 'PEREMPT — S',
    klass: 'bg-red-100 text-red-800',
  },
  'struck-cause-defense': {
    label: 'CAUSE — D',
    klass: 'bg-amber-100 text-amber-800',
  },
  'struck-cause-state': {
    label: 'CAUSE — S',
    klass: 'bg-amber-100 text-amber-800',
  },
  'excused-by-court': {
    label: 'EXCUSED',
    klass: 'bg-slate-200 text-slate-700',
  },
  disqualified: {
    label: 'DISQ',
    klass: 'bg-slate-200 text-slate-700',
  },
};

export default function SeatCard({ seat, juror, onClick }: Props) {
  const badge = juror ? STATUS_BADGE[juror.status] : undefined;
  const dimmed = juror && juror.status !== 'active' && juror.status !== 'kept';

  return (
    <button
      type="button"
      data-testid={`seat-${seat}`}
      onClick={onClick}
      className={
        'text-left rounded-md bg-[var(--card-paper)] border border-[var(--card-rule)] ' +
        'p-2 min-h-32 border-l-4 ' +
        (juror ? LEAN_COLOR[juror.lean] : 'border-l-slate-200') +
        (dimmed ? ' opacity-60' : '')
      }
    >
      <div className="text-[10px] text-slate-500 flex justify-between">
        <span>Seat {seat}</span>
        {juror?.identity.jurorNumber && (
          <span>#{juror.identity.jurorNumber}</span>
        )}
      </div>
      <div className="text-sm font-medium mt-1">
        {juror?.identity.name || (
          <span className="text-slate-400 italic">Empty</span>
        )}
      </div>
      {juror?.employment.jobTitle && (
        <div className="text-xs text-slate-600 mt-1 line-clamp-1">
          {juror.employment.jobTitle}
        </div>
      )}
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-2 flex gap-1 items-center">
        {juror?.demographics.maritalStatus &&
          juror.demographics.maritalStatus !== 'unknown' &&
          juror.demographics.maritalStatus}
        {badge && (
          <span
            className={
              'ml-auto px-1.5 py-0.5 rounded text-[9px] font-semibold ' +
              badge.klass
            }
          >
            {badge.label}
          </span>
        )}
      </div>
    </button>
  );
}
```

- [ ] **Step 2: Add the `/cases/:caseId/decision` route**

Modify `src/routes.tsx`:

```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import CaseList from './screens/CaseList';
import CaseSetup from './screens/CaseSetup';
import Questioning from './screens/Questioning';
import Decision from './screens/Decision';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/cases" replace /> },
  { path: '/cases', element: <CaseList /> },
  { path: '/cases/new', element: <CaseSetup /> },
  { path: '/cases/:caseId/questioning', element: <Questioning /> },
  { path: '/cases/:caseId/decision', element: <Decision /> },
]);
```

- [ ] **Step 3: Write failing test for Decision screen**

`src/screens/Decision.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../db/db';
import {
  createCase,
  populateFirstPanelFromVenire,
  advanceToDecision,
} from '../db/repository';
import Decision from './Decision';
import { useCaseStore } from '../store/caseStore';

beforeEach(async () => {
  await db.delete();
  await db.open();
  useCaseStore.setState({ activeCase: null });
});

async function readyCase() {
  const c = await createCase({ name: 'Test' });
  await populateFirstPanelFromVenire(
    c.id,
    Array.from({ length: 21 }).map((_, i) => ({ name: `J${i + 1}` }))
  );
  await advanceToDecision(c.id);
  return c.id;
}

function renderAt(caseId: string) {
  return render(
    <MemoryRouter initialEntries={[`/cases/${caseId}/decision`]}>
      <Routes>
        <Route
          path="/cases/:caseId/decision"
          element={<Decision />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('Decision', () => {
  it('renders all 21 seats', async () => {
    const id = await readyCase();
    renderAt(id);
    const seats = await screen.findAllByTestId(/^seat-\d+$/);
    expect(seats.length).toBe(21);
  });

  it('opens a strike picker when a seat is tapped and saves the decision', async () => {
    const id = await readyCase();
    renderAt(id);
    const user = userEvent.setup();

    await user.click(await screen.findByText('J1'));

    // Picker opens with default "Keep"
    expect(
      await screen.findByRole('heading', { name: /decide: j1/i })
    ).toBeInTheDocument();

    // Choose peremptory-defense and type a reason
    await user.click(screen.getByLabelText(/peremptory — defense/i));
    await user.type(
      screen.getByPlaceholderText(/race-neutral reason/i),
      'prior LE family'
    );
    await user.click(screen.getByRole('button', { name: /save decision/i }));

    // Badge appears on seat 1
    const seat1 = await screen.findByTestId('seat-1');
    expect(seat1.textContent).toMatch(/PEREMPT — D/);
  });

  it('prevents saving a strike without a reason', async () => {
    const id = await readyCase();
    renderAt(id);
    const user = userEvent.setup();

    await user.click(await screen.findByText('J1'));
    await user.click(screen.getByLabelText(/cause — state/i));
    await user.click(screen.getByRole('button', { name: /save decision/i }));

    expect(
      await screen.findByText(/a reason is required/i)
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run tests to verify failure**

```bash
npm test -- Decision
```
Expected: FAIL — Decision module not found.

- [ ] **Step 5: Implement `src/screens/Decision.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import SeatGrid from '../components/SeatGrid';
import StrikePicker, { type StrikeChoice } from '../components/StrikePicker';
import { markJurorStrike } from '../db/repository';

export default function Decision() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);

  const [openJurorId, setOpenJurorId] = useState<string | null>(null);

  useEffect(() => {
    if (caseId) loadCase(caseId).catch(console.error);
  }, [caseId, loadCase]);

  const panel = activeCase?.panels[activeCase.currentPanelIndex];
  const openJuror = panel?.jurors.find((j) => j.id === openJurorId);

  async function onSave(status: StrikeChoice, reason: string) {
    if (!caseId || !openJurorId) return;
    await markJurorStrike(caseId, openJurorId, { status, reason });
    await loadCase(caseId);
    setOpenJurorId(null);
  }

  if (!activeCase || !panel) {
    return <div className="p-8 text-slate-500">Loading…</div>;
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white px-8 py-4">
        <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
        <div className="text-xs text-slate-500">
          Panel {panel.index} — Decision
        </div>
      </header>

      <div className="p-8">
        <SeatGrid
          jurors={panel.jurors}
          onSeatClick={(seat) => {
            const j = panel.jurors.find((x) => x.seatIndex === seat);
            if (j) setOpenJurorId(j.id);
          }}
        />
      </div>

      {openJuror && (
        <StrikePicker
          jurorName={openJuror.identity.name}
          currentStatus={openJuror.status}
          currentReason={openJuror.strikeReason}
          onCancel={() => setOpenJurorId(null)}
          onConfirm={onSave}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Re-run tests**

```bash
npm test -- Decision
npm test
npm run typecheck
```
Expected: Decision tests PASS (3). Full suite: 33 + 3 = 36. Typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: Decision screen with strike picker and status badges"
```

---

### Task 5: Wire "Finish Questioning → Decision" and "Finish Decisions" transitions

**Files:**
- Modify: `src/screens/Questioning.tsx` (replace the alert stub with a real navigation)
- Modify: `src/screens/Decision.tsx` (add "Finish Decisions" header button)

- [ ] **Step 1: Replace the Questioning alert with real transition**

In `src/screens/Questioning.tsx`, add import at top:

```tsx
import { useNavigate } from 'react-router-dom';
import { advanceToDecision } from '../db/repository';
```

Inside the component, add `const nav = useNavigate();` alongside existing hooks.

Replace the header button's `onClick` (which currently calls `alert(...)`):

```tsx
onClick={async () => {
  if (!caseId) return;
  try {
    await advanceToDecision(caseId);
    nav(`/cases/${caseId}/decision`);
  } catch (e) {
    alert((e as Error).message);
  }
}}
```

- [ ] **Step 2: Add "Finish Decisions" to Decision screen header**

In `src/screens/Decision.tsx`, add imports at top:

```tsx
import { useNavigate } from 'react-router-dom';
import {
  finishDecisionsForPanel,
  startNextPanel,
} from '../db/repository';
```

Add `const nav = useNavigate();` inside the component (alongside hooks).

Replace the `<header>` block with:

```tsx
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
          <div className="text-xs text-slate-500">
            Panel {panel.index} — Decision
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={panel.jurors.some(
              (j) => j.status === 'active' && j.seatIndex != null
            )}
            onClick={async () => {
              if (!caseId) return;
              try {
                await finishDecisionsForPanel(caseId);
                const fresh = await (await import('../db/repository')).getCase(
                  caseId
                );
                if (fresh?.mode === 'seated') {
                  nav(`/cases/${caseId}/seated`);
                }
                // else stay on decision; user can click "Start next panel"
                await loadCase(caseId);
              } catch (e) {
                alert((e as Error).message);
              }
            }}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300"
          >
            Finish Decisions
          </button>
          {panel.status === 'decided' && (
            <button
              type="button"
              onClick={async () => {
                if (!caseId) return;
                await startNextPanel(caseId);
                await loadCase(caseId);
                nav(`/cases/${caseId}/questioning`);
              }}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Start Next Panel
            </button>
          )}
        </div>
      </header>
```

- [ ] **Step 3: Add the `/cases/:caseId/seated` route (stub for now)**

Create `src/screens/SeatedJury.tsx` as a minimal stub (full impl in Task 10):

```tsx
export default function SeatedJury() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Seated Jury</h1>
      <p className="text-slate-500 text-sm mt-2">
        Full view ships in the next task.
      </p>
    </div>
  );
}
```

Add to `src/routes.tsx`:

```tsx
import SeatedJury from './screens/SeatedJury';
// ...
  { path: '/cases/:caseId/seated', element: <SeatedJury /> },
```

- [ ] **Step 4: Run tests + typecheck**

```bash
npm test
npm run typecheck
```
Expected: all tests still pass (36), typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire Questioning→Decision and Finish Decisions transitions"
```

---

## Phase 3 — Peremptory Tracker + Batson tally

### Task 6: Batson tally computation

**Files:**
- Create: `src/lib/batson.ts`
- Create: `src/lib/batson.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/batson.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { batsonTally } from './batson';
import type { Case, Juror } from '../types/case';
import { makeEmptyJuror } from './panel';

function juror(overrides: Partial<Juror>): Juror {
  return { ...makeEmptyJuror('p'), ...overrides };
}

function caseWithJurors(jurors: Juror[]): Case {
  const now = new Date().toISOString();
  return {
    id: 'c',
    schemaVersion: 1,
    meta: {
      name: 'Test',
      targetJurors: 12,
      targetAlternates: 2,
      peremptoryBudget: { defense: 12, state: 12 },
    },
    mode: 'decision',
    currentPanelIndex: 0,
    panels: [
      { id: 'p', index: 1, status: 'questioning', jurors, createdAt: now },
    ],
    seatedJurorOrder: [],
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

describe('batsonTally', () => {
  it('aggregates peremptories by side × race', () => {
    const c = caseWithJurors([
      juror({
        status: 'struck-peremptory-defense',
        demographics: { race: 'black', gender: 'male', maritalStatus: 'unknown' },
      }),
      juror({
        status: 'struck-peremptory-state',
        demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
      }),
      juror({
        status: 'struck-peremptory-state',
        demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
      }),
      juror({
        status: 'struck-peremptory-state',
        demographics: { race: 'white', gender: 'male', maritalStatus: 'unknown' },
      }),
    ]);
    const t = batsonTally(c);
    expect(t.byRace.defense.black).toBe(1);
    expect(t.byRace.state.black).toBe(2);
    expect(t.byRace.state.white).toBe(1);
    expect(t.totals.defense).toBe(1);
    expect(t.totals.state).toBe(3);
  });

  it('aggregates peremptories by side × gender', () => {
    const c = caseWithJurors([
      juror({
        status: 'struck-peremptory-defense',
        demographics: { race: 'unknown', gender: 'female', maritalStatus: 'unknown' },
      }),
      juror({
        status: 'struck-peremptory-state',
        demographics: { race: 'unknown', gender: 'male', maritalStatus: 'unknown' },
      }),
    ]);
    const t = batsonTally(c);
    expect(t.byGender.defense.female).toBe(1);
    expect(t.byGender.state.male).toBe(1);
  });

  it('excludes cause strikes, excusals, kept, and active', () => {
    const c = caseWithJurors([
      juror({
        status: 'struck-cause-defense',
        demographics: { race: 'black', gender: 'male', maritalStatus: 'unknown' },
      }),
      juror({
        status: 'excused-by-court',
        demographics: { race: 'black', gender: 'male', maritalStatus: 'unknown' },
      }),
      juror({
        status: 'kept',
        demographics: { race: 'black', gender: 'male', maritalStatus: 'unknown' },
      }),
      juror({
        status: 'active',
        demographics: { race: 'black', gender: 'male', maritalStatus: 'unknown' },
      }),
    ]);
    const t = batsonTally(c);
    expect(t.totals.defense).toBe(0);
    expect(t.totals.state).toBe(0);
    expect(t.byRace.defense.black).toBe(0);
  });

  it('aggregates across all panels', () => {
    const base = caseWithJurors([
      juror({
        status: 'struck-peremptory-state',
        demographics: { race: 'black', gender: 'male', maritalStatus: 'unknown' },
      }),
    ]);
    // Add a second panel with another strike
    const now = new Date().toISOString();
    base.panels.push({
      id: 'p2',
      index: 2,
      status: 'questioning',
      jurors: [
        juror({
          status: 'struck-peremptory-state',
          demographics: { race: 'hispanic', gender: 'male', maritalStatus: 'unknown' },
        }),
      ],
      createdAt: now,
    });
    const t = batsonTally(base);
    expect(t.byRace.state.black).toBe(1);
    expect(t.byRace.state.hispanic).toBe(1);
    expect(t.totals.state).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- batson
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/batson.ts`**

```ts
import type { Case, Gender, Race } from '../types/case';

type Side = 'defense' | 'state';

type RaceCounts = Record<Race, number>;
type GenderCounts = Record<Gender, number>;

export interface BatsonTally {
  byRace: Record<Side, RaceCounts>;
  byGender: Record<Side, GenderCounts>;
  totals: Record<Side, number>;
}

function emptyRace(): RaceCounts {
  return {
    black: 0,
    white: 0,
    hispanic: 0,
    asian: 0,
    'native-american': 0,
    'pacific-islander': 0,
    other: 0,
    unknown: 0,
  };
}

function emptyGender(): GenderCounts {
  return { male: 0, female: 0, nonbinary: 0, unknown: 0 };
}

export function batsonTally(c: Case): BatsonTally {
  const t: BatsonTally = {
    byRace: { defense: emptyRace(), state: emptyRace() },
    byGender: { defense: emptyGender(), state: emptyGender() },
    totals: { defense: 0, state: 0 },
  };
  for (const panel of c.panels) {
    for (const j of panel.jurors) {
      let side: Side | null = null;
      if (j.status === 'struck-peremptory-defense') side = 'defense';
      else if (j.status === 'struck-peremptory-state') side = 'state';
      if (!side) continue;
      t.byRace[side][j.demographics.race]++;
      t.byGender[side][j.demographics.gender]++;
      t.totals[side]++;
    }
  }
  return t;
}
```

Note: `Race` and `Gender` are imported from `'../types/case'` only if re-exported there. They actually live in `'../types/demographics'`. Adjust the import:

```ts
import type { Case } from '../types/case';
import type { Race, Gender } from '../types/demographics';
```

- [ ] **Step 4: Re-run tests**

```bash
npm test -- batson
npm run typecheck
```
Expected: PASS (4 tests), typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Batson tally computation across panels"
```

---

### Task 7: PeremptoryTracker + BatsonTallyHeader in Decision mode

**Files:**
- Create: `src/components/PeremptoryTracker.tsx`
- Create: `src/components/BatsonTallyHeader.tsx`
- Modify: `src/screens/Decision.tsx`

- [ ] **Step 1: Implement `src/components/PeremptoryTracker.tsx`**

```tsx
import type { Case } from '../types/case';
import { peremptoryCounts } from '../lib/strike';

interface Props {
  activeCase: Case;
  variant?: 'rail' | 'full';
}

interface SideStrike {
  jurorId: string;
  name: string;
  panelIndex: number;
  seatIndex: number | null;
  reason: string;
}

function collectStrikes(c: Case): {
  defense: SideStrike[];
  state: SideStrike[];
} {
  const out = { defense: [] as SideStrike[], state: [] as SideStrike[] };
  for (const panel of c.panels) {
    for (const j of panel.jurors) {
      const entry: SideStrike = {
        jurorId: j.id,
        name: j.identity.name || '(unnamed)',
        panelIndex: panel.index,
        seatIndex: j.seatIndex,
        reason: j.strikeReason ?? '',
      };
      if (j.status === 'struck-peremptory-defense') out.defense.push(entry);
      else if (j.status === 'struck-peremptory-state') out.state.push(entry);
    }
  }
  return out;
}

export default function PeremptoryTracker({ activeCase, variant = 'rail' }: Props) {
  const strikes = collectStrikes(activeCase);
  const counts = peremptoryCounts(activeCase.panels.flatMap((p) => p.jurors));
  const { defense: dBudget, state: sBudget } = activeCase.meta.peremptoryBudget;

  const rail = variant === 'rail';

  return (
    <section
      className={
        rail
          ? 'bg-slate-50 border-l border-slate-200 p-4 w-72 h-full overflow-y-auto text-sm'
          : 'p-8 grid grid-cols-2 gap-8'
      }
    >
      <SideColumn
        label="Defense"
        accent="text-emerald-800"
        used={counts.defense}
        budget={dBudget}
        entries={strikes.defense}
      />
      <SideColumn
        label="State"
        accent="text-red-800"
        used={counts.state}
        budget={sBudget}
        entries={strikes.state}
      />
    </section>
  );
}

function SideColumn({
  label,
  accent,
  used,
  budget,
  entries,
}: {
  label: string;
  accent: string;
  used: number;
  budget: number;
  entries: SideStrike[];
}) {
  const remaining = Math.max(0, budget - used);
  const warn = used >= Math.max(1, budget - 2);
  const full = used >= budget;

  return (
    <div className="mb-4">
      <header className="mb-2">
        <h3 className={`text-sm font-semibold ${accent}`}>{label}</h3>
        <div
          className={
            'text-xs ' +
            (full
              ? 'text-red-700 font-semibold'
              : warn
              ? 'text-amber-700 font-semibold'
              : 'text-slate-500')
          }
          data-testid={`tracker-${label.toLowerCase()}-status`}
        >
          {used} of {budget} used — {remaining} remaining
          {full && ' (MAX)'}
        </div>
      </header>
      <ul className="grid gap-1.5">
        {entries.map((e, i) => (
          <li
            key={e.jurorId}
            className="bg-white rounded border border-slate-200 px-2 py-1.5"
          >
            <div className="text-xs font-medium">
              {i + 1}. {e.name}
            </div>
            <div className="text-[10px] text-slate-500">
              Panel {e.panelIndex}
              {e.seatIndex != null ? ` · seat ${e.seatIndex}` : ''}
            </div>
            <div className="text-[11px] text-slate-700 mt-0.5 line-clamp-2">
              {e.reason || <em>no reason recorded</em>}
            </div>
          </li>
        ))}
        {Array.from({ length: Math.max(0, budget - entries.length) }).map(
          (_, i) => (
            <li
              key={`empty-${i}`}
              className="rounded border border-dashed border-slate-300 px-2 py-1.5 text-[10px] text-slate-400 text-center"
            >
              unused
            </li>
          )
        )}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Implement `src/components/BatsonTallyHeader.tsx`**

```tsx
import type { Case } from '../types/case';
import { batsonTally } from '../lib/batson';
import { RACE_LABELS } from '../types/demographics';

interface Props {
  activeCase: Case;
}

export default function BatsonTallyHeader({ activeCase }: Props) {
  const t = batsonTally(activeCase);

  function sideLine(side: 'defense' | 'state') {
    const races = Object.entries(t.byRace[side]).filter(([, n]) => n > 0);
    if (races.length === 0) return <span className="text-slate-500">—</span>;
    return (
      <span>
        {races
          .map(
            ([r, n]) => `${n} ${RACE_LABELS[r as keyof typeof RACE_LABELS]}`
          )
          .join(' · ')}
      </span>
    );
  }

  return (
    <div
      className="grid grid-cols-2 gap-6 border-t border-slate-200 px-8 py-2 bg-slate-50 text-xs"
      data-testid="batson-tally-header"
    >
      <div>
        <span className="font-semibold text-emerald-800">Defense: </span>
        {sideLine('defense')}
      </div>
      <div>
        <span className="font-semibold text-red-800">State: </span>
        {sideLine('state')}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire both into the Decision screen**

Modify `src/screens/Decision.tsx`. Add imports:

```tsx
import PeremptoryTracker from '../components/PeremptoryTracker';
import BatsonTallyHeader from '../components/BatsonTallyHeader';
```

Replace the top-level render tree (replace the existing `<div className="min-h-full">` wrapper) with:

```tsx
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
          <div className="text-xs text-slate-500">
            Panel {panel.index} — Decision
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={panel.jurors.some(
              (j) => j.status === 'active' && j.seatIndex != null
            )}
            onClick={async () => {
              if (!caseId) return;
              try {
                await finishDecisionsForPanel(caseId);
                const fresh = await (await import('../db/repository')).getCase(
                  caseId
                );
                if (fresh?.mode === 'seated') {
                  nav(`/cases/${caseId}/seated`);
                }
                await loadCase(caseId);
              } catch (e) {
                alert((e as Error).message);
              }
            }}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300"
          >
            Finish Decisions
          </button>
          {panel.status === 'decided' && (
            <button
              type="button"
              onClick={async () => {
                if (!caseId) return;
                await startNextPanel(caseId);
                await loadCase(caseId);
                nav(`/cases/${caseId}/questioning`);
              }}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Start Next Panel
            </button>
          )}
        </div>
      </header>

      <BatsonTallyHeader activeCase={activeCase} />

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 p-8 overflow-auto">
          <SeatGrid
            jurors={panel.jurors}
            onSeatClick={(seat) => {
              const j = panel.jurors.find((x) => x.seatIndex === seat);
              if (j) setOpenJurorId(j.id);
            }}
          />
        </div>
        <PeremptoryTracker activeCase={activeCase} />
      </div>

      {openJuror && (
        <StrikePicker
          jurorName={openJuror.identity.name}
          currentStatus={openJuror.status}
          currentReason={openJuror.strikeReason}
          onCancel={() => setOpenJurorId(null)}
          onConfirm={onSave}
        />
      )}
    </div>
  );
```

- [ ] **Step 4: Run tests + typecheck**

```bash
npm test
npm run typecheck
```

The existing Decision tests will still pass (the rail/header add components, not remove assertions).

Expected: 36 unit tests still pass, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Peremptory Tracker rail + Batson tally header in Decision mode"
```

---

### Task 8: Full-screen Peremptory Tracker route

**Files:**
- Create: `src/screens/PeremptoryTrackerScreen.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Implement `src/screens/PeremptoryTrackerScreen.tsx`**

```tsx
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import PeremptoryTracker from '../components/PeremptoryTracker';

export default function PeremptoryTrackerScreen() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);

  useEffect(() => {
    if (caseId) loadCase(caseId).catch(console.error);
  }, [caseId, loadCase]);

  if (!activeCase) return <div className="p-8 text-slate-500">Loading…</div>;

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
          <div className="text-xs text-slate-500">Peremptory Tracker</div>
        </div>
        <Link
          to={`/cases/${caseId}/decision`}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to Decision
        </Link>
      </header>
      <PeremptoryTracker activeCase={activeCase} variant="full" />
    </div>
  );
}
```

- [ ] **Step 2: Add the route**

Modify `src/routes.tsx`:

```tsx
import PeremptoryTrackerScreen from './screens/PeremptoryTrackerScreen';
// ...
  { path: '/cases/:caseId/tracker', element: <PeremptoryTrackerScreen /> },
```

- [ ] **Step 3: Run tests + typecheck**

```bash
npm test
npm run typecheck
```
Expected: all tests pass, typecheck clean.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: full-screen Peremptory Tracker route"
```

---

## Phase 4 — Seated Jury + PDF export

### Task 9: Seated Jury screen

**Files:**
- Modify: `src/screens/SeatedJury.tsx` (replace stub)
- Modify: `src/db/repository.ts` (add `reorderSeatedJurors`)
- Create: `src/screens/SeatedJury.test.tsx`

- [ ] **Step 1: Add `reorderSeatedJurors` to repository**

Append to `src/db/repository.ts`:

```ts
export async function reorderSeatedJurors(
  caseId: string,
  newOrder: string[]
): Promise<void> {
  const c = await getCase(caseId);
  if (!c) throw new Error(`Case ${caseId} not found`);
  const kept = new Set(
    c.panels.flatMap((p) =>
      p.jurors.filter((j) => j.status === 'kept').map((j) => j.id)
    )
  );
  // Validate that newOrder is exactly the set of kept juror IDs
  if (newOrder.length !== kept.size || newOrder.some((id) => !kept.has(id))) {
    throw new Error('Order must contain every kept juror id exactly once');
  }
  c.seatedJurorOrder = newOrder;
  await saveCase(c);
}
```

- [ ] **Step 2: Write failing test**

`src/screens/SeatedJury.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../db/db';
import {
  createCase,
  populateFirstPanelFromVenire,
  advanceToDecision,
  markJurorStrike,
  finishDecisionsForPanel,
  getCase,
} from '../db/repository';
import SeatedJury from './SeatedJury';
import { useCaseStore } from '../store/caseStore';

beforeEach(async () => {
  await db.delete();
  await db.open();
  useCaseStore.setState({ activeCase: null });
});

async function seatedCase() {
  const c = await createCase({ name: 'Done' });
  await populateFirstPanelFromVenire(
    c.id,
    Array.from({ length: 21 }).map((_, i) => ({ name: `J${i + 1}` }))
  );
  await advanceToDecision(c.id);
  const fresh = (await getCase(c.id))!;
  const jurors = fresh.panels[0].jurors;
  for (let i = 0; i < 14; i++) {
    await markJurorStrike(c.id, jurors[i].id, { status: 'kept', reason: '' });
  }
  for (let i = 14; i < 21; i++) {
    await markJurorStrike(c.id, jurors[i].id, {
      status: 'struck-peremptory-state',
      reason: 'x',
    });
  }
  await finishDecisionsForPanel(c.id);
  return c.id;
}

function renderAt(caseId: string) {
  return render(
    <MemoryRouter initialEntries={[`/cases/${caseId}/seated`]}>
      <Routes>
        <Route path="/cases/:caseId/seated" element={<SeatedJury />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SeatedJury', () => {
  it('lists the kept jurors in order', async () => {
    const id = await seatedCase();
    renderAt(id);
    for (let i = 1; i <= 14; i++) {
      expect(await screen.findByText(`J${i}`)).toBeInTheDocument();
    }
  });

  it('labels first 12 as Juror 1..12 and rest as Alternates', async () => {
    const id = await seatedCase();
    renderAt(id);
    expect(await screen.findByText(/Juror 12/i)).toBeInTheDocument();
    expect(await screen.findByText(/Alternate 1/i)).toBeInTheDocument();
    expect(await screen.findByText(/Alternate 2/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run to verify failure**

```bash
npm test -- SeatedJury
```
Expected: FAIL (stub renders "Full view ships in next task").

- [ ] **Step 4: Implement `src/screens/SeatedJury.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import { reorderSeatedJurors, seatedJurors } from '../db/repository';
import type { Juror } from '../types/case';

export default function SeatedJury() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);

  useEffect(() => {
    if (caseId) loadCase(caseId).catch(console.error);
  }, [caseId, loadCase]);

  const [dragFrom, setDragFrom] = useState<number | null>(null);

  if (!activeCase) return <div className="p-8 text-slate-500">Loading…</div>;

  const kept = seatedJurors(activeCase);
  const orderedIds =
    activeCase.seatedJurorOrder.length === kept.length
      ? activeCase.seatedJurorOrder
      : kept.map((j) => j.id);
  const byId = new Map(kept.map((j) => [j.id, j]));
  const ordered: Juror[] = orderedIds
    .map((id) => byId.get(id))
    .filter((x): x is Juror => !!x);

  const target = activeCase.meta.targetJurors;
  const totalSeats = target + activeCase.meta.targetAlternates;

  async function reorder(from: number, to: number) {
    if (!caseId || from === to) return;
    const ids = ordered.map((j) => j.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    await reorderSeatedJurors(caseId, ids);
    await loadCase(caseId);
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
          <div className="text-xs text-slate-500">
            Seated Jury — {ordered.length} of {totalSeats} seats filled
          </div>
        </div>
        <Link
          to={`/cases/${caseId}/report`}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Export PDF Report
        </Link>
      </header>

      <ul className="p-8 grid gap-2 max-w-3xl">
        {ordered.map((j, i) => {
          const isAlt = i >= target;
          const label = isAlt ? `Alternate ${i - target + 1}` : `Juror ${i + 1}`;
          return (
            <li
              key={j.id}
              draggable
              onDragStart={() => setDragFrom(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragFrom != null) reorder(dragFrom, i);
                setDragFrom(null);
              }}
              className={
                'rounded border border-slate-200 bg-white px-4 py-3 flex items-center gap-4 cursor-move ' +
                (dragFrom === i ? 'opacity-50' : '')
              }
            >
              <div className="w-24 text-xs uppercase tracking-wider text-slate-500">
                {label}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{j.identity.name}</div>
                <div className="text-xs text-slate-500">
                  {j.employment.jobTitle || '—'}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 5: Re-run tests + typecheck**

```bash
npm test -- SeatedJury
npm test
npm run typecheck
```
Expected: 2 SeatedJury tests PASS. Full count: 38 (36 + 2). Typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Seated Jury screen with drag-reorder and labeled alternates"
```

---

### Task 10: Install `@react-pdf/renderer`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install**

```bash
cd "/Users/greatelephant82/Library/Mobile Documents/com~apple~CloudDocs/Claude Software Developer/Jury Selection"
npm install @react-pdf/renderer
```

- [ ] **Step 2: Sanity check**

```bash
npm run build
```
Expected: build succeeds. Clean up: `rm -rf dist`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @react-pdf/renderer for PDF export"
```

---

### Task 11: PDF report document

**Files:**
- Create: `src/pdf/JuryReportDocument.tsx`

- [ ] **Step 1: Implement the PDF document**

`src/pdf/JuryReportDocument.tsx`:

```tsx
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Case, Juror } from '../types/case';
import { batsonTally } from '../lib/batson';
import {
  RACE_LABELS,
  GENDER_LABELS,
  MARITAL_LABELS,
} from '../types/demographics';

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: 'Helvetica' },
  h1: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  h2: { fontSize: 13, fontWeight: 700, marginTop: 14, marginBottom: 6 },
  h3: { fontSize: 11, fontWeight: 700, marginTop: 10, marginBottom: 4 },
  meta: { marginBottom: 10, color: '#475569' },
  kv: { flexDirection: 'row', marginBottom: 2 },
  k: { width: 90, color: '#64748b' },
  v: { flex: 1 },
  jurorBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 6,
    marginBottom: 6,
    borderRadius: 2,
  },
  grid3: { flexDirection: 'row', justifyContent: 'space-between' },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    marginVertical: 6,
  },
});

function jurorDisposition(j: Juror): string {
  switch (j.status) {
    case 'active':
      return 'Active (undecided)';
    case 'kept':
      return 'Kept';
    case 'struck-peremptory-defense':
      return 'Peremptory — Defense';
    case 'struck-peremptory-state':
      return 'Peremptory — State';
    case 'struck-cause-defense':
      return 'Cause — Defense';
    case 'struck-cause-state':
      return 'Cause — State';
    case 'excused-by-court':
      return 'Excused by court';
    case 'disqualified':
      return 'Disqualified mid-questioning';
  }
}

export default function JuryReportDocument({ activeCase }: { activeCase: Case }) {
  const tally = batsonTally(activeCase);
  const target = activeCase.meta.targetJurors;
  const kept: Juror[] = activeCase.panels
    .flatMap((p) => p.jurors.filter((j) => j.status === 'kept'));
  const orderedKept: Juror[] =
    activeCase.seatedJurorOrder.length === kept.length
      ? (activeCase.seatedJurorOrder
          .map((id) => kept.find((j) => j.id === id))
          .filter((x): x is Juror => !!x))
      : kept;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>{activeCase.meta.name}</Text>
        <View style={styles.meta}>
          {activeCase.meta.docketNumber && (
            <View style={styles.kv}>
              <Text style={styles.k}>Docket #</Text>
              <Text style={styles.v}>{activeCase.meta.docketNumber}</Text>
            </View>
          )}
          {activeCase.meta.parish && (
            <View style={styles.kv}>
              <Text style={styles.k}>Parish</Text>
              <Text style={styles.v}>{activeCase.meta.parish}</Text>
            </View>
          )}
          {activeCase.meta.judge && (
            <View style={styles.kv}>
              <Text style={styles.k}>Judge</Text>
              <Text style={styles.v}>{activeCase.meta.judge}</Text>
            </View>
          )}
          {activeCase.meta.trialDate && (
            <View style={styles.kv}>
              <Text style={styles.k}>Trial date</Text>
              <Text style={styles.v}>{activeCase.meta.trialDate}</Text>
            </View>
          )}
        </View>

        <Text style={styles.h2}>Seated Jury</Text>
        {orderedKept.map((j, i) => {
          const label =
            i < target ? `Juror ${i + 1}` : `Alternate ${i - target + 1}`;
          return (
            <View key={j.id} style={styles.kv}>
              <Text style={styles.k}>{label}</Text>
              <Text style={styles.v}>
                {j.identity.name}
                {j.employment.jobTitle ? ` — ${j.employment.jobTitle}` : ''}
              </Text>
            </View>
          );
        })}

        <Text style={styles.h2}>Peremptory Strikes — Batson Summary</Text>
        <Text>
          Defense peremptories: {tally.totals.defense} · State peremptories:{' '}
          {tally.totals.state}
        </Text>
        <Text style={styles.h3}>By race</Text>
        {(['defense', 'state'] as const).map((side) => {
          const nonZero = Object.entries(tally.byRace[side]).filter(
            ([, n]) => n > 0
          );
          if (nonZero.length === 0) return null;
          return (
            <Text key={side}>
              {side === 'defense' ? 'Defense' : 'State'}:{' '}
              {nonZero
                .map(
                  ([r, n]) =>
                    `${n} ${RACE_LABELS[r as keyof typeof RACE_LABELS]}`
                )
                .join(' · ')}
            </Text>
          );
        })}
      </Page>

      {activeCase.panels.map((panel) => (
        <Page key={panel.id} size="LETTER" style={styles.page}>
          <Text style={styles.h2}>
            Panel {panel.index} ({panel.status})
          </Text>
          {panel.jurors.map((j) => (
            <View key={j.id} style={styles.jurorBox}>
              <View style={styles.grid3}>
                <Text style={{ fontWeight: 700 }}>
                  Seat {j.seatIndex ?? '—'} · {j.identity.name || '(unnamed)'}
                </Text>
                <Text>{jurorDisposition(j)}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.kv}>
                <Text style={styles.k}>Juror #</Text>
                <Text style={styles.v}>{j.identity.jurorNumber ?? '—'}</Text>
              </View>
              <View style={styles.kv}>
                <Text style={styles.k}>Demographics</Text>
                <Text style={styles.v}>
                  {RACE_LABELS[j.demographics.race]} ·{' '}
                  {GENDER_LABELS[j.demographics.gender]} ·{' '}
                  {MARITAL_LABELS[j.demographics.maritalStatus]}
                </Text>
              </View>
              {j.employment.employer && (
                <View style={styles.kv}>
                  <Text style={styles.k}>Employer</Text>
                  <Text style={styles.v}>
                    {j.employment.employer}
                    {j.employment.jobTitle ? ` (${j.employment.jobTitle})` : ''}
                  </Text>
                </View>
              )}
              {j.strikeReason && (
                <View style={styles.kv}>
                  <Text style={styles.k}>Strike reason</Text>
                  <Text style={styles.v}>{j.strikeReason}</Text>
                </View>
              )}
              {j.disqualificationReason && (
                <View style={styles.kv}>
                  <Text style={styles.k}>Disq. reason</Text>
                  <Text style={styles.v}>{j.disqualificationReason}</Text>
                </View>
              )}
              {j.notes && (
                <View style={styles.kv}>
                  <Text style={styles.k}>Notes</Text>
                  <Text style={styles.v}>{j.notes}</Text>
                </View>
              )}
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: @react-pdf jury report document"
```

---

### Task 12: PDF preview screen + download

**Files:**
- Create: `src/screens/PdfPreview.tsx`
- Modify: `src/routes.tsx`

- [ ] **Step 1: Implement the preview screen**

`src/screens/PdfPreview.tsx`:

```tsx
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { useCaseStore } from '../store/caseStore';
import JuryReportDocument from '../pdf/JuryReportDocument';

export default function PdfPreview() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);

  useEffect(() => {
    if (caseId) loadCase(caseId).catch(console.error);
  }, [caseId, loadCase]);

  if (!activeCase) return <div className="p-8 text-slate-500">Loading…</div>;

  const filename =
    (activeCase.meta.name || 'jury')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-voir-dire-report.pdf';

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
          <div className="text-xs text-slate-500">PDF report preview</div>
        </div>
        <div className="flex gap-3">
          <Link
            to={`/cases/${caseId}/seated`}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ← Back to Seated Jury
          </Link>
          <PDFDownloadLink
            document={<JuryReportDocument activeCase={activeCase} />}
            fileName={filename}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {({ loading }) => (loading ? 'Preparing…' : 'Download PDF')}
          </PDFDownloadLink>
        </div>
      </header>

      <div className="flex-1">
        <PDFViewer width="100%" height="100%" className="border-0">
          <JuryReportDocument activeCase={activeCase} />
        </PDFViewer>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the route**

Modify `src/routes.tsx`:

```tsx
import PdfPreview from './screens/PdfPreview';
// ...
  { path: '/cases/:caseId/report', element: <PdfPreview /> },
```

- [ ] **Step 3: Build + typecheck**

```bash
npm run build
npm run typecheck
```
Expected: both succeed. Clean up: `rm -rf dist`.

- [ ] **Step 4: Run unit + E2E smoke**

```bash
npm test
npm run test:e2e
```
Expected: all tests still pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: PDF preview screen with download link"
```

---

## Phase 5 — .jury file save/open

### Task 13: `.jury` file serializer + deserializer

**Files:**
- Create: `src/lib/juryfile.ts`
- Create: `src/lib/juryfile.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/juryfile.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { serializeCase, deserializeCase } from './juryfile';
import type { Case } from '../types/case';

function sampleCase(): Case {
  const now = new Date().toISOString();
  return {
    id: 'c',
    schemaVersion: 1,
    meta: {
      name: 'State v. X',
      targetJurors: 12,
      targetAlternates: 2,
      peremptoryBudget: { defense: 12, state: 12 },
    },
    mode: 'questioning',
    currentPanelIndex: 0,
    panels: [
      {
        id: 'p',
        index: 1,
        status: 'questioning',
        jurors: [],
        createdAt: now,
      },
    ],
    seatedJurorOrder: [],
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

describe('serializeCase / deserializeCase', () => {
  it('round-trips a case', () => {
    const c = sampleCase();
    const payload = serializeCase(c, 'app-test');
    const back = deserializeCase(payload);
    expect(back).toEqual(c);
  });

  it('serialized payload is valid JSON with schemaVersion, exportedAt, exportedBy', () => {
    const c = sampleCase();
    const payload = serializeCase(c, 'jury-selection-app/0.2.0');
    const obj = JSON.parse(payload);
    expect(obj.schemaVersion).toBe(1);
    expect(typeof obj.exportedAt).toBe('string');
    expect(obj.exportedBy).toBe('jury-selection-app/0.2.0');
    expect(obj.case.id).toBe('c');
  });

  it('rejects payload from a newer schema version', () => {
    const c = sampleCase();
    const payload = serializeCase(c, 'x');
    const tampered = payload.replace('"schemaVersion":1', '"schemaVersion":99');
    expect(() => deserializeCase(tampered)).toThrow(
      /newer version of the app/i
    );
  });

  it('rejects malformed JSON', () => {
    expect(() => deserializeCase('not json')).toThrow(/invalid/i);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- juryfile
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/juryfile.ts`**

```ts
import type { Case } from '../types/case';
import { CURRENT_SCHEMA_VERSION } from '../types/schema';
import { migrate } from '../db/migrations';

export interface JuryFileEnvelope {
  schemaVersion: number;
  exportedAt: string;
  exportedBy: string;
  case: Case;
}

export function serializeCase(c: Case, exportedBy: string): string {
  const envelope: JuryFileEnvelope = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    exportedBy,
    case: c,
  };
  return JSON.stringify(envelope, null, 2);
}

export function deserializeCase(payload: string): Case {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error('Invalid .jury file: not valid JSON.');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid .jury file: not an object.');
  }
  const envelope = parsed as Partial<JuryFileEnvelope>;
  if (typeof envelope.schemaVersion !== 'number' || !envelope.case) {
    throw new Error('Invalid .jury file: missing schemaVersion or case.');
  }
  // Run through the migration gate — throws if newer than supported
  const { migrated } = migrate(
    { ...envelope.case, schemaVersion: envelope.schemaVersion },
    CURRENT_SCHEMA_VERSION
  );
  return migrated;
}
```

- [ ] **Step 4: Re-run tests**

```bash
npm test -- juryfile
```
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: .jury file serializer and deserializer"
```

---

### Task 14: File I/O wrapper (File System Access API + fallback)

**Files:**
- Create: `src/lib/files.ts`
- Create: `src/hooks/useFileShortcuts.ts`

- [ ] **Step 1: Implement the file I/O wrapper**

`src/lib/files.ts`:

```ts
// Browser file I/O wrapper with File System Access API (macOS Chrome/Edge)
// and download/upload fallback (iPad Safari).

export interface SaveResult {
  method: 'fsa' | 'download';
}

declare global {
  interface Window {
    showSaveFilePicker?: (opts?: unknown) => Promise<unknown>;
    showOpenFilePicker?: (opts?: unknown) => Promise<unknown[]>;
  }
}

function hasFileSystemAccess(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.showSaveFilePicker === 'function' &&
    typeof window.showOpenFilePicker === 'function'
  );
}

export async function saveJuryFile(
  suggestedName: string,
  text: string
): Promise<SaveResult> {
  if (hasFileSystemAccess()) {
    try {
      const handle = (await (window.showSaveFilePicker as any)({
        suggestedName,
        types: [
          {
            description: 'Jury Selection case file',
            accept: { 'application/json': ['.jury'] },
          },
        ],
      })) as {
        createWritable(): Promise<{
          write(data: string): Promise<void>;
          close(): Promise<void>;
        }>;
      };
      const stream = await handle.createWritable();
      await stream.write(text);
      await stream.close();
      return { method: 'fsa' };
    } catch (e) {
      // User may have cancelled — fall through to download fallback
      if ((e as DOMException)?.name === 'AbortError') return { method: 'fsa' };
      // Any other error: continue to fallback
    }
  }
  // Download fallback
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { method: 'download' };
}

export async function openJuryFile(): Promise<string | null> {
  if (hasFileSystemAccess()) {
    try {
      const [handle] = (await (window.showOpenFilePicker as any)({
        multiple: false,
        types: [
          {
            description: 'Jury Selection case file',
            accept: { 'application/json': ['.jury', '.json'] },
          },
        ],
      })) as {
        getFile(): Promise<Blob>;
      }[];
      const file = await handle.getFile();
      return await file.text();
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return null;
    }
  }
  // Fallback: use an <input type="file">
  return new Promise<string | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jury,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve(await file.text());
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
```

- [ ] **Step 2: Implement the keyboard-shortcut hook**

`src/hooks/useFileShortcuts.ts`:

```ts
import { useEffect } from 'react';

export interface FileShortcuts {
  onSave?: () => void;
  onOpen?: () => void;
}

export function useFileShortcuts({ onSave, onOpen }: FileShortcuts) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 's' && onSave) {
        e.preventDefault();
        onSave();
      } else if (e.key === 'o' && onOpen) {
        e.preventDefault();
        onOpen();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSave, onOpen]);
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: .jury file save/open wrapper and keyboard shortcut hook"
```

---

### Task 15: Wire Save/Open into the app

**Files:**
- Modify: `src/screens/CaseList.tsx`
- Modify: `src/screens/Questioning.tsx`
- Modify: `src/screens/Decision.tsx`
- Modify: `src/db/repository.ts`

- [ ] **Step 1: Add an `importCaseFromFile` helper to the repository**

Append to `src/db/repository.ts`:

```ts
import { deserializeCase } from '../lib/juryfile';

export async function importCaseFromFile(payload: string): Promise<string> {
  const c = deserializeCase(payload);
  // Generate a new id to avoid clobbering an existing case with the same id
  const newCase = { ...c, id: newId(), updatedAt: new Date().toISOString() };
  await saveCase(newCase);
  return newCase.id;
}
```

- [ ] **Step 2: Wire "Open .jury File" into Case List**

Modify `src/screens/CaseList.tsx`. Add imports at top:

```tsx
import { openJuryFile } from '../lib/files';
import { importCaseFromFile } from '../db/repository';
import { useNavigate } from 'react-router-dom';
```

Inside the component, add:
```tsx
  const nav = useNavigate();

  async function onOpenFile() {
    const text = await openJuryFile();
    if (!text) return;
    try {
      const id = await importCaseFromFile(text);
      nav(`/cases/${id}/questioning`);
    } catch (e) {
      alert('Could not open .jury file: ' + (e as Error).message);
    }
  }
```

Modify the header's right side (currently has only the "New Case" Link) to add an "Open .jury File" button next to it:

```tsx
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cases</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenFile}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Open .jury File
          </button>
          <Link
            to="/cases/new"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            New Case
          </Link>
        </div>
      </header>
```

- [ ] **Step 3: Wire "Save Case" keyboard shortcut into Questioning and Decision**

Modify `src/screens/Questioning.tsx`. Add imports:

```tsx
import { serializeCase } from '../lib/juryfile';
import { saveJuryFile } from '../lib/files';
import { useFileShortcuts } from '../hooks/useFileShortcuts';
```

Inside the component (after `activeCase` is in scope), add:

```tsx
  useFileShortcuts({
    onSave: async () => {
      if (!activeCase) return;
      const name =
        (activeCase.meta.name || 'case')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') + '.jury';
      const text = serializeCase(activeCase, 'jury-selection-app/0.2.0');
      await saveJuryFile(name, text);
    },
  });
```

Apply the same block to `src/screens/Decision.tsx` (identical imports + hook call).

- [ ] **Step 4: Typecheck + tests**

```bash
npm run typecheck
npm test
```
Expected: clean + all tests pass (the shortcut hook is not tested automatically; it's manual-verified in the dry-run).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Open .jury File entry and Cmd/Ctrl+S Save shortcut"
```

---

## Phase 6 — Close-out

### Task 16: E2E strike-to-PDF flow test

**Files:**
- Create: `tests/e2e/strike-flow.spec.ts`

- [ ] **Step 1: Write the E2E test**

`tests/e2e/strike-flow.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('full strike-to-seated flow: questioning → decision → seated → PDF link visible', async ({
  page,
}) => {
  // Start fresh
  await page.goto('/');
  await expect(page).toHaveURL(/\/cases$/);

  // Create a case and import 21 jurors
  await page.getByRole('link', { name: /new case/i }).click();
  await page.getByLabel(/case name/i).fill('E2E v. Strike');
  const rows = Array.from({ length: 21 })
    .map((_, i) => `J${i + 1},${100 + i}`)
    .join('\n');
  await page
    .getByPlaceholder(/name,juror_number/i)
    .fill('name,juror_number\n' + rows);
  await page.getByRole('button', { name: /create case/i }).click();

  // On Questioning: advance to Decision
  await expect(page.getByText('Panel 1 — Questioning')).toBeVisible();
  await page
    .getByRole('button', { name: /finish questioning/i })
    .click();
  await expect(page).toHaveURL(/\/decision$/);
  await expect(page.getByText('Panel 1 — Decision')).toBeVisible();

  // Keep the first 14, peremptory-state the remaining 7
  for (let i = 1; i <= 14; i++) {
    await page.getByText(`J${i}`, { exact: true }).click();
    await page.getByRole('button', { name: /save decision/i }).click();
  }
  for (let i = 15; i <= 21; i++) {
    await page.getByText(`J${i}`, { exact: true }).click();
    await page.getByLabel(/peremptory — state/i).click();
    await page.getByPlaceholder(/race-neutral reason/i).fill('demeanor');
    await page.getByRole('button', { name: /save decision/i }).click();
  }

  // Finish decisions → should navigate to Seated Jury
  await page.getByRole('button', { name: /finish decisions/i }).click();
  await expect(page).toHaveURL(/\/seated$/);
  await expect(page.getByText(/Juror 12/i)).toBeVisible();
  await expect(page.getByText(/Alternate 2/i)).toBeVisible();

  // Export PDF Report link is present
  await expect(
    page.getByRole('link', { name: /export pdf report/i })
  ).toBeVisible();
});
```

- [ ] **Step 2: Run E2E**

```bash
npm run test:e2e
```
Expected: 3 E2E tests pass (smoke + questioning-flow + strike-flow).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test: E2E strike flow through to Seated Jury"
```

---

### Task 17: Milestone B checklist + tag

**Files:**
- Create: `docs/CHECKLIST-milestone-b.md`

- [ ] **Step 1: Run all checks**

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```

- [ ] **Step 2: Create `docs/CHECKLIST-milestone-b.md`**

```markdown
# Milestone B Close-out Checklist

## Automated checks

- [ ] `npm run typecheck` — zero errors
- [ ] `npm test` — all unit tests pass
- [ ] `npm run test:e2e` — all Playwright tests pass (smoke, questioning-flow, strike-flow)
- [ ] `npm run build` — production build succeeds; `dist/sw.js` exists
- [ ] `npm run preview` — app loads

## Manual walkthrough (pre-trial dry run)

- [ ] Create a case with capital preset (12 per side)
- [ ] Paste 21 venire rows
- [ ] Complete Questioning → Decision transition
- [ ] In Decision, mark 6 peremptories across both sides (with race-neutral reasons)
- [ ] Verify Peremptory Tracker rail updates live
- [ ] Verify Batson tally header updates live
- [ ] Mark remaining jurors as kept or cause/excused
- [ ] "Finish Decisions" — verify if kept ≥ 14 it goes to Seated Jury; else stays on Decision with "Start Next Panel" enabled
- [ ] On Seated Jury, drag to reorder first 14 into Juror 1..12 + Alternate 1..2
- [ ] "Export PDF Report" — verify preview renders, "Download PDF" downloads a valid .pdf
- [ ] Cmd/Ctrl+S from Questioning or Decision — verify .jury file saves (or downloads on iPad)
- [ ] On Cases screen, "Open .jury File" — import the saved file, verify the case appears with all data
- [ ] Multi-panel flow: keep only 8 jurors in panel 1, finish decisions, click "Start Next Panel", verify panel 2 opens in Questioning mode

## Known limitations for Milestone B

- Mid-panel disqualification reason is stored but not displayed in Decision mode (view-only of prior panel's disposition).
- No full Batson Analysis screen with disparate-treatment helper yet — ships in Milestone C.
- No PWA install onboarding yet — ships in Milestone C.
```

- [ ] **Step 3: Commit + tag**

```bash
git add -A
git commit -m "docs: Milestone B close-out checklist"
git tag milestone-b
git log --oneline | head -20
```

---

## Self-review (performed after writing this plan)

**Spec coverage (checked against `2026-04-20-jury-selection-app-design.md`):**

| Spec requirement | Task |
|---|---|
| Decision mode — strike picker with 6 options | Task 3 (StrikePicker), Task 4 (Decision screen) |
| Required `strikeReason` for every non-keep choice | Task 2 (repository guard), Task 3 (modal guard) |
| Juror notes read-only once Decision starts | Leveraged via existing `readOnly` prop; Decision screen never mounts the editable `JurorDrawer` (tap opens StrikePicker). ✅ |
| Peremptory Tracker rail in Decision mode | Task 7 |
| Peremptory Tracker full-screen view | Task 8 |
| Warning at budget – 2; alert at budget max | Task 7 (SideColumn classes) |
| Live Batson tally header | Task 7 |
| Seated Jury screen with drag-reorder | Task 9 |
| Juror 1..N + Alternate 1..M labels | Task 9 |
| PDF report: case header, per-panel seating, juror cards, Batson tally, seated jury | Task 11 |
| PDF preview + download | Task 12 |
| `.jury` file format `{schemaVersion, exportedAt, exportedBy, case}` | Task 13 |
| Save Case via File System Access API + download fallback | Task 14 |
| Open Case via File System Access API + file picker fallback | Task 14 |
| Cmd/Ctrl+S, Cmd/Ctrl+O shortcuts | Tasks 14, 15 |
| Mode enforcement — can't leave questioning until 21 named seats | Task 2 (`advanceToDecision` guard) |
| Mode enforcement — can't finish decisions with undecided actives | Task 2 (`finishDecisionsForPanel` guard) |
| Multi-panel flow — start new panel if kept count short | Task 2 (`startNextPanel`) + Task 5/7 buttons |

**Placeholder scan:** No TBD/TODO/FIXME in the plan. Tasks 3 and 12 use the design-spec tokens (`var(--card-paper)`) defined in Milestone A's `src/index.css`; those are real references, not placeholders.

**Type consistency:**
- `StrikeChoice` in Task 3 is a subset of `JurorStatus` from the type file. The `markJurorStrike` function in Task 2 accepts `{status: JurorStatus, reason: string}` which accepts any `StrikeChoice`. ✅
- `BatsonTally` shape in Task 6 is consumed in Task 7 (header) and Task 11 (PDF). ✅
- `peremptoryCounts` from Task 1 is consumed in Task 7. ✅
- `seatedJurors(case)` from Task 2 is consumed in Tasks 9 and 11. ✅
- `.jury` envelope (schemaVersion / exportedAt / exportedBy / case) in Task 13 matches the design spec §7.4. ✅

**Deferred to Milestone C (intentional):**
- Full Batson Analysis screen (cross-tab, disparate-treatment helper, pattern flags, motion export).
- PWA install onboarding flow.
- Help screen with pre-trial checklist + shortcut reference.
- Archiving UI (the `archived` flag exists but no UI toggles it yet).
