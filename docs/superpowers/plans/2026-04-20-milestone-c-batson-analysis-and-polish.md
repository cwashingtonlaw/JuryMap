# Jury Selection App — Milestone C: Batson Analysis + polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the dedicated Batson Analysis screen (cross-tab + strike log + disparate-treatment comparator + pattern flags + motion draft export), PWA install onboarding, a Help screen with keyboard shortcut reference and pre-trial checklist, and a case archive UI. Close out v1 of the app.

**Architecture:** Build on the existing Milestone A/B schema — no migrations. Batson Analysis is a new `src/lib/batson-analysis.ts` module of pure computations + a new `BatsonAnalysis` screen. Onboarding uses browser-detection heuristics (no data model change). Archive UI toggles the existing `Case.archived` flag.

**Tech Stack:** React 19, Vite 6, TypeScript 5, Tailwind v4, Dexie, Zustand, React Router v6, Vitest, Playwright. No new runtime deps.

**Spec:** `docs/superpowers/specs/2026-04-20-jury-selection-app-design.md`

**Predecessor:** `docs/superpowers/plans/2026-04-20-milestone-b-strike-flow.md` (tagged `milestone-b`)

---

## File structure at end of Milestone C

```
Jury Selection/
├── src/
│   ├── lib/
│   │   ├── batson-analysis.ts         NEW — strike log + comparators + pattern flags
│   │   ├── batson-analysis.test.ts    NEW
│   │   ├── batson-motion.ts           NEW — HTML motion draft generator
│   │   ├── batson-motion.test.ts      NEW
│   │   └── platform.ts                NEW — browser / PWA-install detection helpers
│   ├── components/
│   │   ├── BatsonCrossTab.tsx         NEW
│   │   ├── BatsonStrikeLog.tsx        NEW
│   │   ├── ComparatorList.tsx         NEW
│   │   └── BatsonPatternFlags.tsx     NEW
│   ├── screens/
│   │   ├── BatsonAnalysis.tsx         NEW
│   │   ├── InstallOnboarding.tsx      NEW
│   │   └── Help.tsx                   NEW
│   ├── screens/
│   │   ├── CaseList.tsx               MODIFIED — archive toggle, Help link, onboarding banner
│   │   └── Decision.tsx               MODIFIED — link to Batson Analysis
│   ├── db/
│   │   └── repository.ts              MODIFIED — archiveCase / unarchiveCase helpers
│   └── routes.tsx                     MODIFIED — /batson, /onboarding, /help routes
└── docs/
    └── CHECKLIST-milestone-c.md       NEW
```

---

## Phase 1 — Batson Analysis core

### Task 1: Strike log, comparator scoring, pattern flags (pure logic)

**Files:**
- Create: `src/lib/batson-analysis.ts`
- Create: `src/lib/batson-analysis.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/batson-analysis.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  batsonStrikeLog,
  comparatorsFor,
  batsonPatternFlags,
} from './batson-analysis';
import type { Case, Juror } from '../types/case';
import { makeEmptyJuror } from './panel';

function juror(overrides: Partial<Juror>): Juror {
  return { ...makeEmptyJuror('p'), ...overrides };
}

function buildCase(jurors: Juror[]): Case {
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
      {
        id: 'p',
        index: 1,
        status: 'questioning',
        jurors,
        createdAt: now,
      },
    ],
    seatedJurorOrder: [],
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

describe('batsonStrikeLog', () => {
  it('returns peremptory strikes sorted by updatedAt ascending', () => {
    const c = buildCase([
      juror({
        id: 'j1',
        identity: { name: 'Alice' },
        status: 'struck-peremptory-state',
        strikeReason: 'a',
        updatedAt: '2026-04-20T12:00:00.000Z',
        demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
      }),
      juror({
        id: 'j2',
        identity: { name: 'Bob' },
        status: 'struck-peremptory-defense',
        strikeReason: 'b',
        updatedAt: '2026-04-20T12:05:00.000Z',
        demographics: { race: 'white', gender: 'male', maritalStatus: 'unknown' },
      }),
      juror({
        id: 'j3',
        identity: { name: 'Carla' },
        status: 'kept',
        updatedAt: '2026-04-20T12:10:00.000Z',
        demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
      }),
    ]);
    const log = batsonStrikeLog(c);
    expect(log.length).toBe(2);
    expect(log[0].jurorId).toBe('j1');
    expect(log[0].side).toBe('state');
    expect(log[1].side).toBe('defense');
  });

  it('excludes cause strikes and excusals', () => {
    const c = buildCase([
      juror({
        id: 'j1',
        status: 'struck-cause-defense',
        strikeReason: 'x',
        demographics: { race: 'black', gender: 'male', maritalStatus: 'unknown' },
      }),
    ]);
    expect(batsonStrikeLog(c)).toEqual([]);
  });
});

describe('comparatorsFor', () => {
  const common = (over: Partial<Juror>): Juror =>
    juror({
      ...over,
      flags: {
        priorJury: { value: false },
        crimeVictim: { value: true, note: '' },
        leFamily: { value: false },
        leFriend: { value: false },
        arrestHx: { value: false },
        convictionHx: { value: false },
        hardship: { value: false },
      },
      employment: { jobTitle: 'Teacher' },
    });

  it('finds kept jurors of a different race with shared attributes', () => {
    const struck = common({
      id: 'js',
      status: 'struck-peremptory-state',
      strikeReason: 'crime victim history',
      demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
    });
    const kept = common({
      id: 'jk',
      status: 'kept',
      demographics: { race: 'white', gender: 'female', maritalStatus: 'unknown' },
    });
    const c = buildCase([struck, kept]);
    const comps = comparatorsFor(c, 'js');
    expect(comps.length).toBe(1);
    expect(comps[0].juror.id).toBe('jk');
    // Shared: crimeVictim flag + jobTitle
    expect(comps[0].sharedAttributes).toContain('crimeVictim');
    expect(comps[0].sharedAttributes).toContain('jobTitle');
    expect(comps[0].score).toBeGreaterThanOrEqual(2);
  });

  it('returns empty when no kept jurors share attributes', () => {
    const struck = juror({
      id: 'js',
      status: 'struck-peremptory-state',
      demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
      flags: {
        priorJury: { value: false },
        crimeVictim: { value: true },
        leFamily: { value: false },
        leFriend: { value: false },
        arrestHx: { value: false },
        convictionHx: { value: false },
        hardship: { value: false },
      },
    });
    const kept = juror({
      id: 'jk',
      status: 'kept',
      demographics: { race: 'white', gender: 'female', maritalStatus: 'unknown' },
      flags: {
        priorJury: { value: false },
        crimeVictim: { value: false },
        leFamily: { value: false },
        leFriend: { value: false },
        arrestHx: { value: false },
        convictionHx: { value: false },
        hardship: { value: false },
      },
    });
    const c = buildCase([struck, kept]);
    expect(comparatorsFor(c, 'js')).toEqual([]);
  });

  it('excludes same-race jurors from comparators', () => {
    const struck = common({
      id: 'js',
      status: 'struck-peremptory-state',
      demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
    });
    const kept = common({
      id: 'jk',
      status: 'kept',
      demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
    });
    const c = buildCase([struck, kept]);
    expect(comparatorsFor(c, 'js')).toEqual([]);
  });
});

describe('batsonPatternFlags', () => {
  function strikeJuror(side: 'defense' | 'state', race: 'black' | 'white' | 'hispanic'): Juror {
    return juror({
      status:
        side === 'defense'
          ? 'struck-peremptory-defense'
          : 'struck-peremptory-state',
      strikeReason: 'x',
      demographics: { race, gender: 'male', maritalStatus: 'unknown' },
    });
  }

  it('flags when one side has ≥ 80% of peremptories against a single race (min 3)', () => {
    const c = buildCase([
      strikeJuror('state', 'black'),
      strikeJuror('state', 'black'),
      strikeJuror('state', 'black'),
      strikeJuror('state', 'black'),
      strikeJuror('state', 'white'),
    ]);
    const flags = batsonPatternFlags(c);
    expect(flags.some((f) => /State.*Black/i.test(f.message))).toBe(true);
  });

  it('raises prima-facie flag when ≥ 3 strikes against a protected group by one side', () => {
    const c = buildCase([
      strikeJuror('state', 'black'),
      strikeJuror('state', 'black'),
      strikeJuror('state', 'black'),
    ]);
    const flags = batsonPatternFlags(c);
    expect(flags.some((f) => /prima facie/i.test(f.message))).toBe(true);
  });

  it('returns no flags when the pattern is balanced', () => {
    const c = buildCase([
      strikeJuror('state', 'black'),
      strikeJuror('state', 'white'),
    ]);
    expect(batsonPatternFlags(c)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run:
```bash
cd "/Users/greatelephant82/Library/Mobile Documents/com~apple~CloudDocs/Claude Software Developer/Jury Selection"
npm test -- batson-analysis
```
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/lib/batson-analysis.ts`**

```ts
import type { Case, Juror } from '../types/case';

export type Side = 'defense' | 'state';

export interface StrikeLogEntry {
  jurorId: string;
  name: string;
  panelIndex: number;
  seatIndex: number | null;
  side: Side;
  race: Juror['demographics']['race'];
  gender: Juror['demographics']['gender'];
  reason: string;
  at: string; // ISO timestamp from juror.updatedAt
}

export function batsonStrikeLog(c: Case): StrikeLogEntry[] {
  const out: StrikeLogEntry[] = [];
  for (const panel of c.panels) {
    for (const j of panel.jurors) {
      let side: Side | null = null;
      if (j.status === 'struck-peremptory-defense') side = 'defense';
      else if (j.status === 'struck-peremptory-state') side = 'state';
      if (!side) continue;
      out.push({
        jurorId: j.id,
        name: j.identity.name || '(unnamed)',
        panelIndex: panel.index,
        seatIndex: j.seatIndex,
        side,
        race: j.demographics.race,
        gender: j.demographics.gender,
        reason: j.strikeReason ?? '',
        at: j.updatedAt,
      });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

export interface Comparator {
  juror: Juror;
  sharedAttributes: string[];
  score: number;
}

function findJuror(c: Case, id: string): Juror | undefined {
  for (const p of c.panels) {
    const j = p.jurors.find((x) => x.id === id);
    if (j) return j;
  }
  return undefined;
}

const FLAG_KEYS = [
  'priorJury',
  'crimeVictim',
  'leFamily',
  'leFriend',
  'arrestHx',
  'convictionHx',
  'hardship',
] as const;

export function comparatorsFor(c: Case, struckJurorId: string): Comparator[] {
  const struck = findJuror(c, struckJurorId);
  if (!struck) return [];

  const allKept: Juror[] = c.panels.flatMap((p) =>
    p.jurors.filter((j) => j.status === 'kept')
  );

  const comps: Comparator[] = [];
  for (const kept of allKept) {
    // Only consider jurors of a different race
    if (kept.demographics.race === struck.demographics.race) continue;

    const shared: string[] = [];

    // Shared flags: both have the flag set to true
    for (const key of FLAG_KEYS) {
      if (struck.flags[key].value && kept.flags[key].value) {
        shared.push(key);
      }
    }

    // Shared employer / job title (case-insensitive, non-empty)
    const sEmp = (struck.employment.employer ?? '').trim().toLowerCase();
    const kEmp = (kept.employment.employer ?? '').trim().toLowerCase();
    if (sEmp && kEmp && sEmp === kEmp) shared.push('employer');

    const sJob = (struck.employment.jobTitle ?? '').trim().toLowerCase();
    const kJob = (kept.employment.jobTitle ?? '').trim().toLowerCase();
    if (sJob && kJob && sJob === kJob) shared.push('jobTitle');

    // Marital status match
    if (
      struck.demographics.maritalStatus !== 'unknown' &&
      struck.demographics.maritalStatus === kept.demographics.maritalStatus
    ) {
      shared.push('maritalStatus');
    }

    if (shared.length > 0) {
      comps.push({
        juror: kept,
        sharedAttributes: shared,
        score: shared.length,
      });
    }
  }
  return comps.sort((a, b) => b.score - a.score);
}

export interface PatternFlag {
  severity: 'warn' | 'alert';
  message: string;
}

const PROTECTED_RACES = ['black', 'hispanic', 'asian', 'native-american', 'pacific-islander'] as const;
const RACE_TITLE: Record<string, string> = {
  black: 'Black',
  white: 'White',
  hispanic: 'Hispanic',
  asian: 'Asian',
  'native-american': 'Native American',
  'pacific-islander': 'Pacific Islander',
  other: 'Other',
  unknown: 'Unknown',
};
const SIDE_TITLE: Record<Side, string> = {
  defense: 'Defense',
  state: 'State',
};

export function batsonPatternFlags(c: Case): PatternFlag[] {
  const flags: PatternFlag[] = [];
  const strikes = batsonStrikeLog(c);

  // Count per side × race
  const perSide: Record<Side, Record<string, number>> = {
    defense: {},
    state: {},
  };
  for (const s of strikes) {
    perSide[s.side][s.race] = (perSide[s.side][s.race] ?? 0) + 1;
  }

  (['defense', 'state'] as const).forEach((side) => {
    const total = Object.values(perSide[side]).reduce((a, b) => a + b, 0);
    if (total < 3) return;
    for (const [race, n] of Object.entries(perSide[side])) {
      const share = n / total;
      if (share >= 0.8) {
        flags.push({
          severity: 'warn',
          message: `${SIDE_TITLE[side]} has used ${n} of ${total} peremptories against ${RACE_TITLE[race] || race} jurors (${Math.round(share * 100)}%)`,
        });
      }
      // Prima facie: ≥ 3 against a protected group by a single side
      if (
        n >= 3 &&
        (PROTECTED_RACES as readonly string[]).includes(race)
      ) {
        flags.push({
          severity: 'alert',
          message: `${SIDE_TITLE[side]} peremptory count against ${RACE_TITLE[race]} jurors is ${n} — a Batson prima facie case is likely established.`,
        });
      }
    }
  });

  // De-duplicate identical messages
  const seen = new Set<string>();
  return flags.filter((f) => {
    if (seen.has(f.message)) return false;
    seen.add(f.message);
    return true;
  });
}
```

- [ ] **Step 4: Re-run tests**

```bash
npm test -- batson-analysis
npm test
npm run typecheck
```
Expected: batson-analysis PASS (8 `it` blocks). Full suite: 54 + 8 = 62 pass. Typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Batson analysis — strike log, comparators, pattern flags"
```

---

## Phase 2 — Batson Analysis screen UI

### Task 2: BatsonCrossTab + BatsonStrikeLog components

**Files:**
- Create: `src/components/BatsonCrossTab.tsx`
- Create: `src/components/BatsonStrikeLog.tsx`

- [ ] **Step 1: Implement BatsonCrossTab**

`src/components/BatsonCrossTab.tsx`:

```tsx
import type { Case } from '../types/case';
import { batsonTally } from '../lib/batson';
import { RACE_LABELS, GENDER_LABELS } from '../types/demographics';

export default function BatsonCrossTab({ activeCase }: { activeCase: Case }) {
  const t = batsonTally(activeCase);
  const races = (Object.keys(RACE_LABELS) as Array<keyof typeof RACE_LABELS>).filter(
    (r) => t.byRace.defense[r] > 0 || t.byRace.state[r] > 0
  );
  const genders = (Object.keys(GENDER_LABELS) as Array<keyof typeof GENDER_LABELS>).filter(
    (g) => t.byGender.defense[g] > 0 || t.byGender.state[g] > 0
  );

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Cross-tab summary
      </h2>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="text-left py-1 pr-4"></th>
            <th className="text-right py-1 px-4 text-emerald-800">Defense</th>
            <th className="text-right py-1 px-4 text-red-800">State</th>
          </tr>
        </thead>
        <tbody>
          {races.map((r) => (
            <tr key={r} className="border-b border-slate-200">
              <td className="py-1 pr-4">{RACE_LABELS[r]}</td>
              <td className="text-right py-1 px-4">{t.byRace.defense[r]}</td>
              <td className="text-right py-1 px-4">{t.byRace.state[r]}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-slate-400 font-semibold">
            <td className="py-1 pr-4">Total peremptories</td>
            <td className="text-right py-1 px-4">{t.totals.defense}</td>
            <td className="text-right py-1 px-4">{t.totals.state}</td>
          </tr>
        </tbody>
      </table>

      {genders.length > 0 && (
        <div className="mt-4 text-xs text-slate-600">
          <span className="font-medium text-slate-500">Gender: </span>
          {genders
            .map(
              (g) =>
                `${GENDER_LABELS[g]} — Defense ${t.byGender.defense[g]} / State ${t.byGender.state[g]}`
            )
            .join(' · ')}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Implement BatsonStrikeLog**

`src/components/BatsonStrikeLog.tsx`:

```tsx
import type { Case } from '../types/case';
import { batsonStrikeLog } from '../lib/batson-analysis';
import { RACE_LABELS, GENDER_LABELS } from '../types/demographics';

interface Props {
  activeCase: Case;
  selectedJurorId?: string | null;
  onSelect: (jurorId: string) => void;
}

export default function BatsonStrikeLog({
  activeCase,
  selectedJurorId,
  onSelect,
}: Props) {
  const entries = batsonStrikeLog(activeCase);
  if (entries.length === 0) {
    return (
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Strike log
        </h2>
        <p className="text-sm text-slate-500 italic">
          No peremptory strikes recorded yet.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Strike log — {entries.length} peremptor{entries.length === 1 ? 'y' : 'ies'}
      </h2>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="text-left py-1 pr-4 font-medium">#</th>
            <th className="text-left py-1 pr-4 font-medium">Juror</th>
            <th className="text-left py-1 pr-4 font-medium">Side</th>
            <th className="text-left py-1 pr-4 font-medium">Race</th>
            <th className="text-left py-1 pr-4 font-medium">Gender</th>
            <th className="text-left py-1 pr-4 font-medium">Panel · seat</th>
            <th className="text-left py-1 pr-4 font-medium">Reason</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const selected = selectedJurorId === e.jurorId;
            return (
              <tr
                key={e.jurorId}
                onClick={() => onSelect(e.jurorId)}
                className={
                  'border-b border-slate-100 cursor-pointer hover:bg-slate-50 ' +
                  (selected ? 'bg-amber-50' : '')
                }
              >
                <td className="py-1 pr-4 text-slate-400">{i + 1}</td>
                <td className="py-1 pr-4 font-medium">{e.name}</td>
                <td className="py-1 pr-4">
                  <span
                    className={
                      e.side === 'defense'
                        ? 'text-emerald-800'
                        : 'text-red-800'
                    }
                  >
                    {e.side === 'defense' ? 'Defense' : 'State'}
                  </span>
                </td>
                <td className="py-1 pr-4">{RACE_LABELS[e.race]}</td>
                <td className="py-1 pr-4">{GENDER_LABELS[e.gender]}</td>
                <td className="py-1 pr-4 text-slate-500">
                  {e.panelIndex}
                  {e.seatIndex != null ? ` · ${e.seatIndex}` : ''}
                </td>
                <td className="py-1 pr-4 text-slate-700 line-clamp-1 max-w-xs">
                  {e.reason || <em className="text-slate-400">—</em>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
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
git commit -m "feat: Batson cross-tab and strike log components"
```

---

### Task 3: ComparatorList + BatsonPatternFlags components

**Files:**
- Create: `src/components/ComparatorList.tsx`
- Create: `src/components/BatsonPatternFlags.tsx`

- [ ] **Step 1: Implement ComparatorList**

`src/components/ComparatorList.tsx`:

```tsx
import type { Case } from '../types/case';
import { comparatorsFor } from '../lib/batson-analysis';
import { RACE_LABELS } from '../types/demographics';

const SHARED_LABELS: Record<string, string> = {
  priorJury: 'Prior jury',
  crimeVictim: 'Crime victim',
  leFamily: 'LE family',
  leFriend: 'LE friend',
  arrestHx: 'Arrest history',
  convictionHx: 'Conviction history',
  hardship: 'Hardship',
  employer: 'Same employer',
  jobTitle: 'Same job title',
  maritalStatus: 'Same marital status',
};

interface Props {
  activeCase: Case;
  struckJurorId: string | null;
}

export default function ComparatorList({ activeCase, struckJurorId }: Props) {
  if (!struckJurorId) {
    return (
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Comparators
        </h2>
        <p className="text-sm text-slate-500 italic">
          Select a struck juror from the log above to see kept jurors of a different race who share one or more characteristics.
        </p>
      </section>
    );
  }

  const struck = activeCase.panels
    .flatMap((p) => p.jurors)
    .find((j) => j.id === struckJurorId);
  if (!struck) return null;

  const comps = comparatorsFor(activeCase, struckJurorId);

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Comparators for {struck.identity.name || '(unnamed)'} (
        {RACE_LABELS[struck.demographics.race]})
      </h2>
      {comps.length === 0 ? (
        <p className="text-sm text-slate-500 italic">
          No kept jurors of a different race share any of the tracked attributes
          with this juror.
        </p>
      ) : (
        <ul className="grid gap-3">
          {comps.map((c) => (
            <li
              key={c.juror.id}
              className="rounded border border-slate-200 bg-white p-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">
                    {c.juror.identity.name || '(unnamed)'} ·{' '}
                    {RACE_LABELS[c.juror.demographics.race]}
                  </div>
                  <div className="text-xs text-slate-500">
                    Kept. {c.juror.employment.jobTitle ?? '—'}
                    {c.juror.employment.employer
                      ? ` at ${c.juror.employment.employer}`
                      : ''}
                  </div>
                </div>
                <div
                  className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-semibold"
                  title={`${c.score} shared attribute${c.score === 1 ? '' : 's'}`}
                >
                  Similarity {c.score}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {c.sharedAttributes.map((a) => (
                  <span
                    key={a}
                    className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700"
                  >
                    {SHARED_LABELS[a] ?? a}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Implement BatsonPatternFlags**

`src/components/BatsonPatternFlags.tsx`:

```tsx
import type { Case } from '../types/case';
import { batsonPatternFlags } from '../lib/batson-analysis';

export default function BatsonPatternFlags({ activeCase }: { activeCase: Case }) {
  const flags = batsonPatternFlags(activeCase);
  if (flags.length === 0) {
    return (
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Pattern flags
        </h2>
        <p className="text-sm text-slate-500 italic">
          No pattern flags yet. Flags appear when a side&apos;s peremptories skew against one race (≥ 80% with ≥ 3 total strikes, or ≥ 3 against a protected group).
        </p>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Pattern flags
      </h2>
      <ul className="grid gap-2">
        {flags.map((f, i) => (
          <li
            key={i}
            className={
              'rounded px-3 py-2 text-sm ' +
              (f.severity === 'alert'
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-amber-50 border border-amber-200 text-amber-800')
            }
          >
            {f.severity === 'alert' ? '⚠ ' : ''}
            {f.message}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: Batson comparator list and pattern flag components"
```

---

### Task 4: BatsonAnalysis screen + route + Decision link

**Files:**
- Create: `src/screens/BatsonAnalysis.tsx`
- Create: `src/screens/BatsonAnalysis.test.tsx`
- Modify: `src/routes.tsx`
- Modify: `src/screens/Decision.tsx` (add a link to /batson)

- [ ] **Step 1: Write failing test**

`src/screens/BatsonAnalysis.test.tsx`:

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
  markJurorStrike,
  getCase,
} from '../db/repository';
import BatsonAnalysis from './BatsonAnalysis';
import { useCaseStore } from '../store/caseStore';

beforeEach(async () => {
  await db.delete();
  await db.open();
  useCaseStore.setState({ activeCase: null });
});

async function caseWithStrikes() {
  const c = await createCase({ name: 'Batson E2E' });
  await populateFirstPanelFromVenire(
    c.id,
    Array.from({ length: 21 }).map((_, i) => ({ name: `J${i + 1}` }))
  );
  await advanceToDecision(c.id);
  const fresh = (await getCase(c.id))!;
  const jurors = fresh.panels[0].jurors;
  // Strike J1, J2, J3 (first three) as peremptory-state
  for (let i = 0; i < 3; i++) {
    await markJurorStrike(c.id, jurors[i].id, {
      status: 'struck-peremptory-state',
      reason: `reason ${i + 1}`,
    });
  }
  return c.id;
}

function renderAt(caseId: string) {
  return render(
    <MemoryRouter initialEntries={[`/cases/${caseId}/batson`]}>
      <Routes>
        <Route path="/cases/:caseId/batson" element={<BatsonAnalysis />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('BatsonAnalysis', () => {
  it('shows cross-tab, strike log, and selects a strike to view comparators', async () => {
    const id = await caseWithStrikes();
    renderAt(id);

    // Cross-tab title
    expect(await screen.findByText(/cross-tab summary/i)).toBeInTheDocument();

    // Strike log has an entry for J1
    const j1Cell = await screen.findByText('J1');
    expect(j1Cell).toBeInTheDocument();

    // Clicking the row selects it; comparator heading updates
    const user = userEvent.setup();
    await user.click(j1Cell);
    expect(
      await screen.findByText(/comparators for j1/i)
    ).toBeInTheDocument();
  });

  it('has an Export Motion Draft button', async () => {
    const id = await caseWithStrikes();
    renderAt(id);
    expect(
      await screen.findByRole('button', { name: /export motion draft/i })
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- BatsonAnalysis
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/screens/BatsonAnalysis.tsx`**

(The motion draft generator function `exportBatsonMotion` is implemented in Task 5 — we stub the button in this task so the "Export Motion Draft" test passes, with a `console.log` placeholder. Task 5 replaces the handler body.)

```tsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import BatsonCrossTab from '../components/BatsonCrossTab';
import BatsonStrikeLog from '../components/BatsonStrikeLog';
import ComparatorList from '../components/ComparatorList';
import BatsonPatternFlagsComponent from '../components/BatsonPatternFlags';

export default function BatsonAnalysis() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);
  const [selectedJurorId, setSelectedJurorId] = useState<string | null>(null);

  useEffect(() => {
    if (caseId) loadCase(caseId).catch(console.error);
  }, [caseId, loadCase]);

  if (!activeCase) return <div className="p-8 text-slate-500">Loading…</div>;

  function exportMotion() {
    // Wired in Task 5 — for now just a no-op stub.
    console.log('Export motion draft — implemented in Task 5');
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
          <div className="text-xs text-slate-500">Batson Analysis</div>
        </div>
        <div className="flex gap-3 items-center">
          <Link
            to={`/cases/${caseId}/decision`}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ← Back to Decision
          </Link>
          <button
            type="button"
            onClick={exportMotion}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Export Motion Draft
          </button>
        </div>
      </header>

      <div className="p-8 max-w-4xl">
        <BatsonPatternFlagsComponent activeCase={activeCase} />
        <BatsonCrossTab activeCase={activeCase} />
        <BatsonStrikeLog
          activeCase={activeCase}
          selectedJurorId={selectedJurorId}
          onSelect={setSelectedJurorId}
        />
        <ComparatorList
          activeCase={activeCase}
          struckJurorId={selectedJurorId}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Add the route**

Modify `src/routes.tsx`:

```tsx
import BatsonAnalysis from './screens/BatsonAnalysis';
// ...
  { path: '/cases/:caseId/batson', element: <BatsonAnalysis /> },
```

- [ ] **Step 5: Add a "Batson Analysis" link to the Decision header**

In `src/screens/Decision.tsx`, locate the header's right-side `<div className="flex gap-2">` (containing "Finish Decisions" and possibly "Start Next Panel"). Add this link **before** the "Finish Decisions" button:

```tsx
          <Link
            to={`/cases/${caseId}/batson`}
            className="text-sm text-slate-600 hover:text-slate-900 self-center mr-2"
          >
            Batson Analysis
          </Link>
```

Make sure `Link` is imported from `react-router-dom` (it was imported alongside `useNavigate` in earlier tasks — add it to the import if absent).

- [ ] **Step 6: Re-run tests + typecheck**

```bash
npm test -- BatsonAnalysis
npm test
npm run typecheck
```
Expected: 2 new BatsonAnalysis tests pass. Full suite: 62 + 2 = 64. Typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: BatsonAnalysis screen + Decision link"
```

---

### Task 5: Motion draft generator + wiring

**Files:**
- Create: `src/lib/batson-motion.ts`
- Create: `src/lib/batson-motion.test.ts`
- Modify: `src/screens/BatsonAnalysis.tsx` (replace the stub `exportMotion`)

- [ ] **Step 1: Write failing test**

`src/lib/batson-motion.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateBatsonMotionHtml } from './batson-motion';
import type { Case, Juror } from '../types/case';
import { makeEmptyJuror } from './panel';

function juror(overrides: Partial<Juror>): Juror {
  return { ...makeEmptyJuror('p'), ...overrides };
}

function c(): Case {
  const now = new Date().toISOString();
  return {
    id: 'c',
    schemaVersion: 1,
    meta: {
      name: 'State v. Test',
      docketNumber: '12-345',
      parish: 'Calcasieu',
      judge: 'Hon. Jones',
      targetJurors: 12,
      targetAlternates: 2,
      peremptoryBudget: { defense: 12, state: 12 },
    },
    mode: 'decision',
    currentPanelIndex: 0,
    panels: [
      {
        id: 'p',
        index: 1,
        status: 'questioning',
        jurors: [
          juror({
            id: 'a',
            identity: { name: 'Alice' },
            status: 'struck-peremptory-state',
            strikeReason: 'prior jury deadlock',
            demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
          }),
          juror({
            id: 'b',
            identity: { name: 'Bob' },
            status: 'struck-peremptory-state',
            strikeReason: 'crime victim',
            demographics: { race: 'black', gender: 'male', maritalStatus: 'unknown' },
          }),
          juror({
            id: 'c',
            identity: { name: 'Carla' },
            status: 'struck-peremptory-state',
            strikeReason: 'LE family',
            demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
          }),
          juror({
            id: 'd',
            identity: { name: 'Dan' },
            status: 'kept',
            demographics: { race: 'white', gender: 'male', maritalStatus: 'unknown' },
          }),
        ],
        createdAt: now,
      },
    ],
    seatedJurorOrder: [],
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

describe('generateBatsonMotionHtml', () => {
  it('includes the case caption, docket #, judge', () => {
    const html = generateBatsonMotionHtml(c(), { movant: 'defense' });
    expect(html).toContain('State v. Test');
    expect(html).toContain('12-345');
    expect(html).toContain('Hon. Jones');
  });

  it('lists each peremptory strike with reason', () => {
    const html = generateBatsonMotionHtml(c(), { movant: 'defense' });
    expect(html).toContain('Alice');
    expect(html).toContain('prior jury deadlock');
    expect(html).toContain('Bob');
    expect(html).toContain('Carla');
  });

  it('includes the tally summary', () => {
    const html = generateBatsonMotionHtml(c(), { movant: 'defense' });
    expect(html).toMatch(/State peremptories[:\s]*3/i);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- batson-motion
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/batson-motion.ts`**

```ts
import type { Case } from '../types/case';
import { batsonStrikeLog, comparatorsFor } from './batson-analysis';
import { batsonTally } from './batson';
import { RACE_LABELS, GENDER_LABELS } from '../types/demographics';

export interface MotionOptions {
  movant: 'defense' | 'state'; // which side is moving against the other's peremptories
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateBatsonMotionHtml(
  c: Case,
  opts: MotionOptions
): string {
  const opponent: 'defense' | 'state' =
    opts.movant === 'defense' ? 'state' : 'defense';
  const opponentLabel = opponent === 'defense' ? 'Defense' : 'State';
  const tally = batsonTally(c);
  const log = batsonStrikeLog(c).filter((e) => e.side === opponent);
  const total = tally.totals[opponent];

  const caption = escapeHtml(c.meta.name);
  const docket = escapeHtml(c.meta.docketNumber ?? '');
  const parish = escapeHtml(c.meta.parish ?? '');
  const judge = escapeHtml(c.meta.judge ?? '');

  const strikeRows = log
    .map((s) => {
      const comps = comparatorsFor(c, s.jurorId);
      const compText =
        comps.length > 0
          ? comps
              .slice(0, 3)
              .map(
                (comp) =>
                  `${escapeHtml(comp.juror.identity.name || '(unnamed)')} (${RACE_LABELS[comp.juror.demographics.race]}, kept; shared: ${comp.sharedAttributes.join(', ')})`
              )
              .join('; ')
          : 'none identified';
      return `
        <tr>
          <td>${escapeHtml(s.name)}</td>
          <td>${RACE_LABELS[s.race]}</td>
          <td>${GENDER_LABELS[s.gender]}</td>
          <td>${s.panelIndex}${s.seatIndex != null ? ` · seat ${s.seatIndex}` : ''}</td>
          <td>${escapeHtml(s.reason)}</td>
          <td>${compText}</td>
        </tr>
      `;
    })
    .join('');

  const byRaceSummary = Object.entries(tally.byRace[opponent])
    .filter(([, n]) => n > 0)
    .map(
      ([r, n]) => `${n} ${RACE_LABELS[r as keyof typeof RACE_LABELS]}`
    )
    .join(' · ');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Batson motion — ${caption}</title>
<style>
  body { font-family: "Times New Roman", Times, serif; max-width: 8.5in; margin: 1in auto; font-size: 12pt; }
  h1 { font-size: 14pt; text-align: center; text-transform: uppercase; }
  h2 { font-size: 12pt; margin-top: 1.5em; }
  .caption { text-align: center; margin-bottom: 2em; }
  table { border-collapse: collapse; width: 100%; font-size: 10pt; }
  th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #eee; }
  .note { font-style: italic; color: #333; }
</style>
</head>
<body>
  <div class="caption">
    <div><strong>${caption}</strong></div>
    <div>Docket # ${docket || '________'}</div>
    <div>${parish ? `${parish} Parish, ` : ''}Judge ${judge || '________'}</div>
  </div>

  <h1>${opts.movant === 'defense' ? 'Defendant' : 'State'}'s Motion Challenging ${opponentLabel}'s Peremptory Strikes under <i>Batson v. Kentucky</i></h1>

  <p>
    ${opts.movant === 'defense' ? 'The defendant' : 'The State'}, through undersigned counsel, respectfully moves this Honorable Court to require the ${opponentLabel} to articulate race-neutral reasons for the peremptory challenges exercised against the following prospective jurors, and, finding those reasons pretextual, to prohibit the challenged strikes under <i>Batson v. Kentucky</i>, 476 U.S. 79 (1986), and its Louisiana progeny.
  </p>

  <h2>I. Prima facie showing</h2>
  <p>
    ${opponentLabel} has used ${total} peremptory challenge${total === 1 ? '' : 's'} to this point in voir dire: <strong>${byRaceSummary || 'none recorded'}</strong>.
  </p>

  <h2>II. Strikes challenged</h2>
  <table>
    <thead>
      <tr>
        <th>Juror</th>
        <th>Race</th>
        <th>Gender</th>
        <th>Panel · seat</th>
        <th>Stated reason (if any)</th>
        <th>Comparators</th>
      </tr>
    </thead>
    <tbody>
      ${strikeRows || `<tr><td colspan="6" class="note">No peremptory strikes by ${opponentLabel} recorded.</td></tr>`}
    </tbody>
  </table>

  <h2>III. Comparator analysis</h2>
  <p>
    The comparators column identifies prospective jurors of a different race who share one or more characteristics with each struck juror and whom ${opponentLabel} did <em>not</em> strike. <i>See Miller-El v. Dretke</i>, 545 U.S. 231 (2005). Disparate treatment of similarly-situated jurors is strong evidence of pretext.
  </p>

  <h2>IV. Relief requested</h2>
  <p>
    Counsel respectfully requests that the Court require ${opponentLabel} to state race-neutral reasons for the challenged strikes, and, if those reasons are pretextual or unsupported by the record, to deny the strikes.
  </p>

  <p style="margin-top:3em;">
    Respectfully submitted,<br/>
    __________________________<br/>
    Counsel for ${opts.movant === 'defense' ? 'Defendant' : 'the State'}
  </p>
</body>
</html>`;
}
```

- [ ] **Step 4: Re-run test**

```bash
npm test -- batson-motion
```
Expected: 3 tests PASS.

- [ ] **Step 5: Wire the export button in BatsonAnalysis**

Replace the stub `exportMotion` in `src/screens/BatsonAnalysis.tsx`. Add this import at the top:

```tsx
import { generateBatsonMotionHtml } from '../lib/batson-motion';
```

Replace the entire `function exportMotion()` body with:

```tsx
  function exportMotion() {
    if (!activeCase) return;
    const html = generateBatsonMotionHtml(activeCase, { movant: 'defense' });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    // Open in a new tab; user can print/save as PDF or Word from the browser.
    const win = window.open(url, '_blank', 'noopener');
    if (!win) {
      // Fallback: trigger a download
      const a = document.createElement('a');
      a.href = url;
      a.download =
        (activeCase.meta.name || 'case')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') + '-batson-motion.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    // Revoke later so the new tab has time to load
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
```

- [ ] **Step 6: Full test + typecheck**

```bash
npm test
npm run typecheck
```
Expected: 64 + 3 = 67 tests pass. Typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: Batson motion HTML draft export"
```

---

## Phase 3 — PWA install onboarding

### Task 6: Platform detection helpers

**Files:**
- Create: `src/lib/platform.ts`
- Create: `src/lib/platform.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/platform.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  isStandalonePwa,
  detectPlatform,
  shouldShowInstallPrompt,
} from './platform';

describe('isStandalonePwa', () => {
  it('returns true when display-mode is standalone', () => {
    vi.stubGlobal('window', {
      matchMedia: (q: string) => ({ matches: q.includes('standalone') }),
      navigator: {},
    });
    expect(isStandalonePwa()).toBe(true);
  });

  it('returns false when browser does not match standalone', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false }),
      navigator: {},
    });
    expect(isStandalonePwa()).toBe(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});

describe('detectPlatform', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('detects iPadOS Safari', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false }),
      navigator: {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
        maxTouchPoints: 5, // iPadOS reports macintosh UA but has touch points
      },
    });
    const p = detectPlatform();
    expect(p.family).toBe('ipados');
    expect(p.browser).toBe('safari');
  });

  it('detects macOS Chrome', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false }),
      navigator: {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        maxTouchPoints: 0,
      },
    });
    const p = detectPlatform();
    expect(p.family).toBe('macos');
    expect(p.browser).toBe('chrome');
  });

  it('detects iOS Safari', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false }),
      navigator: {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        maxTouchPoints: 5,
      },
    });
    const p = detectPlatform();
    expect(p.family).toBe('ios');
    expect(p.browser).toBe('safari');
  });
});

describe('shouldShowInstallPrompt', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns false when already installed as PWA', () => {
    vi.stubGlobal('window', {
      matchMedia: (q: string) => ({ matches: q.includes('standalone') }),
      navigator: { userAgent: 'whatever', maxTouchPoints: 0 },
    });
    expect(shouldShowInstallPrompt()).toBe(false);
  });

  it('returns true when non-PWA Safari on iPadOS', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false }),
      navigator: {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
        maxTouchPoints: 5,
      },
    });
    expect(shouldShowInstallPrompt()).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- platform
```
Expected: FAIL.

- [ ] **Step 3: Implement `src/lib/platform.ts`**

```ts
export type PlatformFamily = 'ios' | 'ipados' | 'macos' | 'windows' | 'android' | 'linux' | 'unknown';
export type BrowserId = 'safari' | 'chrome' | 'edge' | 'firefox' | 'other';

export interface PlatformInfo {
  family: PlatformFamily;
  browser: BrowserId;
}

export function isStandalonePwa(): boolean {
  try {
    return !!window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

function getUA(): string {
  try {
    return (window.navigator.userAgent ?? '').toLowerCase();
  } catch {
    return '';
  }
}

function getMaxTouchPoints(): number {
  try {
    return window.navigator.maxTouchPoints ?? 0;
  } catch {
    return 0;
  }
}

export function detectPlatform(): PlatformInfo {
  const ua = getUA();
  let family: PlatformFamily = 'unknown';
  let browser: BrowserId = 'other';

  if (/iphone|ipod/.test(ua)) family = 'ios';
  else if (/ipad/.test(ua)) family = 'ipados';
  else if (/android/.test(ua)) family = 'android';
  else if (/mac os x|macintosh/.test(ua)) {
    // iPadOS 13+ reports Macintosh UA but has touch points
    family = getMaxTouchPoints() > 1 ? 'ipados' : 'macos';
  } else if (/windows nt/.test(ua)) family = 'windows';
  else if (/linux/.test(ua)) family = 'linux';

  // Chrome detection must come BEFORE Safari because Chrome's UA also contains "safari"
  if (/edg\//.test(ua)) browser = 'edge';
  else if (/chrome\//.test(ua) && !/edg\//.test(ua)) browser = 'chrome';
  else if (/firefox\//.test(ua)) browser = 'firefox';
  else if (/safari\//.test(ua)) browser = 'safari';

  return { family, browser };
}

export function shouldShowInstallPrompt(): boolean {
  if (isStandalonePwa()) return false;
  const p = detectPlatform();
  // iPad/iOS Safari storage is eviction-prone without PWA install — strongly recommend
  if ((p.family === 'ipados' || p.family === 'ios') && p.browser === 'safari') {
    return true;
  }
  // Desktop Chrome/Edge also benefits from install, but it's optional. Default true there too.
  if (
    (p.family === 'macos' || p.family === 'windows' || p.family === 'linux') &&
    (p.browser === 'chrome' || p.browser === 'edge')
  ) {
    return true;
  }
  return false;
}
```

- [ ] **Step 4: Re-run tests**

```bash
npm test -- platform
```
Expected: all tests PASS.

- [ ] **Step 5: Full test + typecheck**

```bash
npm test
npm run typecheck
```
Expected: 67 + 7 = 74. Typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: platform and PWA-install detection helpers"
```

---

### Task 7: InstallOnboarding screen + banner on Case List

**Files:**
- Create: `src/screens/InstallOnboarding.tsx`
- Modify: `src/routes.tsx`
- Modify: `src/screens/CaseList.tsx`

- [ ] **Step 1: Implement `src/screens/InstallOnboarding.tsx`**

```tsx
import { Link } from 'react-router-dom';
import { detectPlatform } from '../lib/platform';

export default function InstallOnboarding() {
  const p = detectPlatform();

  return (
    <div className="min-h-full bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Install the Jury Selection app</h1>
        <Link
          to="/cases"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Skip for now
        </Link>
      </header>

      <div className="max-w-2xl mx-auto p-8">
        <p className="text-sm text-slate-700 mb-6">
          Install this web app to your home screen (iPad) or applications folder
          (laptop). Installation keeps your local data (cases, notes, strikes)
          safe from browser cache eviction and gives you a full-screen,
          distraction-free view in court.
        </p>

        {(p.family === 'ipados' || p.family === 'ios') &&
          p.browser === 'safari' && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-2">
                iPad / iPhone (Safari)
              </h2>
              <ol className="list-decimal ml-5 text-sm text-slate-700 space-y-1">
                <li>Tap the <strong>Share</strong> icon at the bottom (or top-right) of Safari.</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                <li>Confirm the name and tap <strong>Add</strong>.</li>
                <li>Open the app from your home screen for normal use.</li>
              </ol>
              <p className="text-xs text-slate-500 mt-2">
                <strong>Why it matters:</strong> Non-installed Safari can evict IndexedDB
                storage under pressure or after ~7 days of inactivity. An
                installed PWA has stable storage.
              </p>
            </section>
          )}

        {(p.family === 'macos' || p.family === 'windows' || p.family === 'linux') &&
          (p.browser === 'chrome' || p.browser === 'edge') && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-2">
                Chrome / Edge (desktop)
              </h2>
              <ol className="list-decimal ml-5 text-sm text-slate-700 space-y-1">
                <li>
                  Look for an <strong>Install</strong> icon in the URL bar (a
                  screen with a down-arrow) or open the three-dot menu.
                </li>
                <li>
                  Click <strong>Install Jury Selection…</strong>. Confirm the
                  install dialog.
                </li>
                <li>
                  The app now opens in its own window; pin it to the Dock or
                  taskbar for quick access.
                </li>
              </ol>
            </section>
          )}

        {!(p.family === 'ipados' || p.family === 'ios' || p.family === 'macos' || p.family === 'windows' || p.family === 'linux') && (
          <section className="mb-8">
            <p className="text-sm text-slate-700">
              Your browser may or may not support installing this app. Look for
              an install option in the address bar or the browser menu.
            </p>
          </section>
        )}

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">After installing</h2>
          <ol className="list-decimal ml-5 text-sm text-slate-700 space-y-1">
            <li>Open the app from the home screen / applications, not through the browser URL.</li>
            <li>Run the dry-run checklist on the Help screen before your first trial use.</li>
          </ol>
        </section>

        <div>
          <Link
            to="/cases"
            className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Continue to the app
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the route**

Modify `src/routes.tsx`:

```tsx
import InstallOnboarding from './screens/InstallOnboarding';
// ...
  { path: '/onboarding', element: <InstallOnboarding /> },
```

- [ ] **Step 3: Add a dismissable install banner to CaseList**

Modify `src/screens/CaseList.tsx`. Add imports near the top:

```tsx
import { shouldShowInstallPrompt, isStandalonePwa } from '../lib/platform';
```

Inside the component, add:

```tsx
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (window.localStorage.getItem('jury:dismissedInstallBanner') === '1') return false;
    return shouldShowInstallPrompt();
  });

  function dismissInstallBanner() {
    window.localStorage.setItem('jury:dismissedInstallBanner', '1');
    setShowInstallBanner(false);
  }
```

Then, just below the `<header>` tag but above the main content area, insert:

```tsx
      {showInstallBanner && !isStandalonePwa() && (
        <div className="bg-amber-50 border-b border-amber-200 px-8 py-3 flex items-center justify-between">
          <div className="text-sm text-amber-900">
            <strong>Install this app</strong> for stable offline storage on your
            trial device.
          </div>
          <div className="flex gap-3 items-center">
            <Link
              to="/onboarding"
              className="text-sm font-medium text-amber-900 underline"
            >
              How to install
            </Link>
            <button
              onClick={dismissInstallBanner}
              className="text-sm text-amber-900/70 hover:text-amber-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
```

Make sure `useState` is imported (it already is from Milestone A).

- [ ] **Step 4: Run tests + typecheck**

```bash
npm test
npm run typecheck
```
Expected: all 74 existing tests still pass. The CaseList tests use jsdom — `shouldShowInstallPrompt` may return true or false depending on jsdom's UA. If the banner appears and breaks an existing CaseList test (which asserts "No cases yet"), set the localStorage flag in the test's `beforeEach`:

If the existing Case List tests fail because the banner text appears and the test uses `findByText(/no cases yet/i)` which still works, nothing breaks. But if a new expectation is needed, add `window.localStorage.setItem('jury:dismissedInstallBanner', '1');` to the beforeEach in `CaseList.test.tsx`.

Report any adjustments in your status.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: PWA install onboarding screen + Case List banner"
```

---

## Phase 4 — Help screen

### Task 8: Help screen with pre-trial checklist + keyboard reference

**Files:**
- Create: `src/screens/Help.tsx`
- Modify: `src/routes.tsx`
- Modify: `src/screens/CaseList.tsx` (add Help link)

- [ ] **Step 1: Implement `src/screens/Help.tsx`**

```tsx
import { Link } from 'react-router-dom';

interface Shortcut {
  keys: string;
  action: string;
  context: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: '←  →', action: 'Cycle to previous/next seat', context: 'Questioning' },
  { keys: '↑  ↓', action: 'Cycle up/down one row (±7 seats)', context: 'Questioning' },
  { keys: '1 – 7', action: 'Set lean rating (1=strongly state → 7=strongly defense)', context: 'Juror drawer' },
  { keys: 'V', action: 'Toggle Crime Victim flag', context: 'Juror drawer' },
  { keys: 'L', action: 'Toggle LE Family flag', context: 'Juror drawer' },
  { keys: 'P', action: 'Toggle Prior Jury flag', context: 'Juror drawer' },
  { keys: 'Esc', action: 'Close juror drawer / modal', context: 'Any modal' },
  { keys: '⌘/Ctrl + S', action: 'Save current case as a .jury file', context: 'Questioning, Decision' },
];

export default function Help() {
  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Help</h1>
        <Link
          to="/cases"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to Cases
        </Link>
      </header>

      <div className="max-w-3xl p-8 grid gap-8">
        <section>
          <h2 className="text-lg font-semibold mb-2">Keyboard shortcuts</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-300 text-slate-500 uppercase tracking-wider text-xs">
                <th className="text-left py-1 pr-4 font-medium">Keys</th>
                <th className="text-left py-1 pr-4 font-medium">Action</th>
                <th className="text-left py-1 pr-4 font-medium">Where</th>
              </tr>
            </thead>
            <tbody>
              {SHORTCUTS.map((s) => (
                <tr key={s.keys} className="border-b border-slate-100">
                  <td className="py-1 pr-4 font-mono text-xs">{s.keys}</td>
                  <td className="py-1 pr-4">{s.action}</td>
                  <td className="py-1 pr-4 text-slate-500">{s.context}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Pre-trial dry-run checklist</h2>
          <p className="text-sm text-slate-600 mb-3">
            Run this the night before every trial so nothing surprises you in
            court.
          </p>
          <ol className="list-decimal ml-5 text-sm text-slate-700 space-y-2">
            <li>Open the app on your trial device. Confirm it is installed (standalone window, not a browser tab).</li>
            <li>Create a throwaway test case. Paste a fake 21-juror venire (CSV with headers: <code>name,juror_number</code>).</li>
            <li>Open each juror, edit every field, close drawer, reopen — verify persistence.</li>
            <li>Disqualify seat 3 (Replace in seat). Verify seat 3 opens up with an empty slot; seats 4–21 unchanged.</li>
            <li>Disqualify seat 4 (Slide left). Verify seats 4–20 shift, seat 21 becomes empty.</li>
            <li>Advance to Decision. Mark each juror with a decision. Include at least 4 peremptory strikes across sides.</li>
            <li>Verify the Peremptory Tracker rail counts update live.</li>
            <li>Verify the Batson tally header updates live.</li>
            <li>Open the dedicated Batson Analysis screen. Verify the strike log, cross-tab, and pattern flags render.</li>
            <li>Click "Export Motion Draft" — verify the HTML draft opens in a new tab.</li>
            <li>Keep enough jurors to reach the target. Finish Decisions → verify the Seated Jury screen.</li>
            <li>Drag-reorder the seated list. Export the PDF report. Confirm it downloads and opens.</li>
            <li>Cmd/Ctrl + S to save the case as a <code>.jury</code> file. On the Cases screen, "Open .jury File" the saved file — verify it reimports cleanly.</li>
            <li>Delete the test case (or archive it).</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">About</h2>
          <p className="text-sm text-slate-600">
            Jury Selection — a Louisiana criminal voir dire companion. Everything
            runs in your browser. No data is sent to any server. To move a case
            between devices, use <code>.jury</code> file save/open.
          </p>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the route**

Modify `src/routes.tsx`:

```tsx
import Help from './screens/Help';
// ...
  { path: '/help', element: <Help /> },
```

- [ ] **Step 3: Add a Help link to the CaseList header**

In `src/screens/CaseList.tsx`, modify the header's right-side button group to include a Help link. Change:

```tsx
        <div className="flex gap-2">
          <button ...>Open .jury File</button>
          <Link to="/cases/new" ...>New Case</Link>
        </div>
```

to:

```tsx
        <div className="flex gap-2 items-center">
          <Link
            to="/help"
            className="text-sm text-slate-600 hover:text-slate-900 mr-1"
          >
            Help
          </Link>
          <button ...>Open .jury File</button>
          <Link to="/cases/new" ...>New Case</Link>
        </div>
```

(Keep the existing `...` contents intact — only add the Help link and the `items-center` class.)

- [ ] **Step 4: Full test + typecheck**

```bash
npm test
npm run typecheck
```
Expected: no regressions. Typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Help screen with shortcuts and pre-trial checklist"
```

---

## Phase 5 — Archive UI

### Task 9: Archive / unarchive cases

**Files:**
- Modify: `src/db/repository.ts` (add `archiveCase`, `unarchiveCase`)
- Modify: `src/screens/CaseList.tsx` (archive toggle, "show archived" view)
- Create: `src/db/repository.archive.test.ts`

- [ ] **Step 1: Write failing test**

`src/db/repository.archive.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import {
  createCase,
  getCase,
  listCases,
  archiveCase,
  unarchiveCase,
} from './repository';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('archiveCase / unarchiveCase', () => {
  it('sets archived=true and hides from default list', async () => {
    const c = await createCase({ name: 'Shelved' });
    await archiveCase(c.id);
    const loaded = await getCase(c.id);
    expect(loaded?.archived).toBe(true);
    const rows = await listCases({ includeArchived: false });
    expect(rows.map((r) => r.id)).not.toContain(c.id);
    const all = await listCases({ includeArchived: true });
    expect(all.map((r) => r.id)).toContain(c.id);
  });

  it('restores archived=false', async () => {
    const c = await createCase({ name: 'Restored' });
    await archiveCase(c.id);
    await unarchiveCase(c.id);
    const loaded = await getCase(c.id);
    expect(loaded?.archived).toBe(false);
    const rows = await listCases({ includeArchived: false });
    expect(rows.map((r) => r.id)).toContain(c.id);
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
npm test -- repository.archive
```
Expected: FAIL (functions not defined).

- [ ] **Step 3: Append to `src/db/repository.ts`**

```ts
export async function archiveCase(caseId: string): Promise<void> {
  const c = await getCase(caseId);
  if (!c) throw new Error(`Case ${caseId} not found`);
  c.archived = true;
  await saveCase(c);
}

export async function unarchiveCase(caseId: string): Promise<void> {
  const c = await getCase(caseId);
  if (!c) throw new Error(`Case ${caseId} not found`);
  c.archived = false;
  await saveCase(c);
}
```

- [ ] **Step 4: Add archive controls to CaseList**

Modify `src/screens/CaseList.tsx`. Add imports:

```tsx
import { archiveCase, unarchiveCase } from '../db/repository';
```

Change the `rows` state + loading to support archived cases:

Replace the existing `useEffect` and `rows`:

```tsx
  const [rows, setRows] = useState<CaseIndexRow[] | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  async function refresh() {
    const r = await listCases({ includeArchived: showArchived });
    setRows(r);
  }

  useEffect(() => {
    let cancelled = false;
    listCases({ includeArchived: showArchived }).then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, [showArchived]);

  async function toggleArchive(id: string, next: boolean) {
    if (next) await archiveCase(id);
    else await unarchiveCase(id);
    await refresh();
  }
```

Add a "Show archived" toggle to the header (in the same `<div className="flex gap-2 items-center">`):

```tsx
          <label className="text-sm text-slate-600 flex items-center gap-1 mr-3">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived
          </label>
```

Modify the `<li>` rendering in the `ul` to expose an Archive button. Replace the `<Link>` inside each `<li>` with:

```tsx
              <li key={r.id} className="flex items-stretch gap-2">
                <Link
                  to={`/cases/${r.id}/questioning`}
                  className="flex-1 block rounded-md border border-slate-200 bg-white px-4 py-3 hover:border-slate-400"
                >
                  <div className="font-medium text-slate-900">
                    {r.name}
                    {r.archived && (
                      <span className="ml-2 text-xs text-slate-500 uppercase tracking-wider">
                        Archived
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    Last edited {new Date(r.updatedAt).toLocaleString()}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => toggleArchive(r.id, !r.archived)}
                  className="rounded-md border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-100"
                >
                  {r.archived ? 'Unarchive' : 'Archive'}
                </button>
              </li>
```

- [ ] **Step 5: Update existing CaseList tests if necessary**

The existing CaseList tests assert "no cases yet" and that case rows render. If the archive button alters the DOM structure so that `findByText('State v. Alpha')` still finds the link text, the tests pass unchanged. If they break, update the test's assertion to use `findByRole('link', { name: /State v\. Alpha/i })` instead.

Run:

```bash
npm test -- CaseList
```

Fix selectors if needed.

- [ ] **Step 6: Full test + typecheck**

```bash
npm test
npm run typecheck
```
Expected: all green, new tests pass, full count 74 + 2 (archive) + 7 (platform from Task 6) + 2 (BatsonAnalysis) + 3 (batson-motion) + 8 (batson-analysis) = 96 tests… actually let me clarify. By end of Task 9, total should be 54 + 8 + 2 + 3 + 7 + 2 = 76 unit tests. The archive tests add 2 more = 78.

Aim for "all tests pass" rather than precise counts — report the actual number.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: archive / unarchive cases with toggle in Case List"
```

---

## Phase 6 — Close-out

### Task 10: E2E test for Batson analysis flow + Milestone C checklist + tag

**Files:**
- Create: `tests/e2e/batson-analysis.spec.ts`
- Create: `docs/CHECKLIST-milestone-c.md`

- [ ] **Step 1: Create `tests/e2e/batson-analysis.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('Batson Analysis screen: strike log, comparators, pattern flag, motion export', async ({
  page,
}) => {
  // Set up a case with 3 state peremptories against black jurors (prima facie)
  await page.goto('/');
  await page.getByRole('link', { name: /new case/i }).click();
  await page.getByLabel(/case name/i).fill('E2E v. Batson');
  const rows = Array.from({ length: 21 })
    .map((_, i) => `J${i + 1},${100 + i}`)
    .join('\n');
  await page
    .getByPlaceholder(/name,juror_number/i)
    .fill('name,juror_number\n' + rows);
  await page.getByRole('button', { name: /create case/i }).click();

  // On Questioning: set J1, J2, J3 to race=black so the strike pattern triggers
  for (let i = 1; i <= 3; i++) {
    await page.getByTestId(`seat-${i}`).click();
    // Race dropdown is the first combobox in the drawer (Race)
    const raceSelect = page.locator('select').first();
    await raceSelect.selectOption('black');
    await page.keyboard.press('Escape');
  }

  // Advance to Decision
  await page.getByRole('button', { name: /finish questioning/i }).click();
  await expect(page).toHaveURL(/\/decision$/);

  // Strike J1, J2, J3 as peremptory-state
  for (let i = 1; i <= 3; i++) {
    await page.getByTestId(`seat-${i}`).click();
    await page.getByLabel(/peremptory — state/i).click();
    await page
      .getByPlaceholder(/race-neutral reason/i)
      .fill(`reason ${i}`);
    await page.getByRole('button', { name: /save decision/i }).click();
  }

  // Open Batson Analysis from Decision link
  await page.getByRole('link', { name: /batson analysis/i }).click();
  await expect(page).toHaveURL(/\/batson$/);

  // Verify the pattern flag appears
  await expect(page.getByText(/prima facie/i)).toBeVisible();

  // Verify the strike log shows J1, J2, J3
  await expect(page.getByText('J1')).toBeVisible();
  await expect(page.getByText('J2')).toBeVisible();
  await expect(page.getByText('J3')).toBeVisible();

  // Click J1 in the log → comparator heading updates
  await page.getByText('J1').first().click();
  await expect(page.getByText(/comparators for j1/i)).toBeVisible();

  // Export Motion Draft button is present and clickable
  await expect(
    page.getByRole('button', { name: /export motion draft/i })
  ).toBeVisible();
});
```

- [ ] **Step 2: Run E2E**

```bash
npm run test:e2e
```
Expected: 4 tests pass (smoke, questioning-flow, strike-flow, batson-analysis).

If selectors need adjustment, fix and re-run. Report any adjustments.

- [ ] **Step 3: Run all checks and write the checklist**

Run:
```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
```
Confirm all pass.

Create `docs/CHECKLIST-milestone-c.md`:

```markdown
# Milestone C Close-out Checklist

## Automated checks

- [ ] `npm run typecheck` — zero errors
- [ ] `npm test` — all unit tests pass
- [ ] `npm run test:e2e` — all Playwright tests pass (smoke, questioning-flow, strike-flow, batson-analysis)
- [ ] `npm run build` — production build succeeds

## Manual walkthrough

- [ ] Install the app as a PWA (onboarding banner appears on first run if eligible)
- [ ] Run a full voir dire: create → import venire → question → decision → seated → PDF
- [ ] During Decision, make several race-differentiated peremptory strikes
- [ ] Open Batson Analysis; verify cross-tab, strike log, and pattern flags
- [ ] Click a struck juror row; verify comparator list shows kept jurors of a different race with shared attributes
- [ ] Click "Export Motion Draft"; verify the HTML draft opens in a new tab with case caption, strike table, and comparator analysis
- [ ] Open Help screen from Cases → verify keyboard shortcut table and pre-trial checklist render
- [ ] Archive a completed case; toggle "Show archived" and verify it reappears; unarchive it

## Known limitations remaining after Milestone C (future work)

- No desktop sync between iPad and laptop without manually moving .jury files. iCloud Drive works as a transport but requires manual save/open.
- PWA install onboarding is informational only — we can't trigger the install dialog programmatically on iOS Safari (Apple's constraint).
- No automated Batson motion template customization per firm / caption format; the generated HTML is a starting draft.
- No aggregated juror intelligence across cases (intentional per spec).
```

- [ ] **Step 4: Commit and tag**

```bash
git add -A
git commit -m "test: E2E Batson analysis flow + Milestone C checklist"
git tag milestone-c
git log --oneline | head -20
```

---

## Self-review (performed after writing this plan)

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Batson Analysis — cross-tab | Task 2 (BatsonCrossTab) |
| Batson Analysis — strike log | Tasks 1 + 2 |
| Batson Analysis — disparate-treatment comparator | Tasks 1 + 3 (ComparatorList) |
| Batson Analysis — pattern flags | Tasks 1 + 3 (BatsonPatternFlags) |
| Batson Analysis — motion draft export | Task 5 |
| BatsonAnalysis screen + route | Task 4 |
| Link from Decision to Batson Analysis | Task 4 |
| PWA install onboarding screen | Task 7 |
| Install prompt detection | Tasks 6 + 7 |
| Install banner on Case List | Task 7 |
| Help screen with pre-trial checklist | Task 8 |
| Help screen with keyboard shortcut reference | Task 8 |
| Archive UI for cases | Task 9 |
| E2E coverage of Batson Analysis | Task 10 |

**Deferred beyond v1 (explicit):**
- Editable motion template / firm-specific caption format
- Automated programmatic install-dialog trigger (iOS Safari doesn't allow it)
- Cross-case aggregated juror intelligence (intentional per spec §3)

**Placeholder scan:** No TBD/TODO/FIXME in the plan. Task 4's `console.log` in `exportMotion` is a documented interim stub replaced in Task 5.

**Type consistency check:**
- `StrikeLogEntry`, `Comparator`, `PatternFlag` types in `batson-analysis.ts` are consumed by the four new components and the motion generator with consistent field names.
- `Side` is exported from `batson-analysis.ts` and also used internally by `batson.ts` — re-exported name is compatible.
- `PlatformInfo`, `BrowserId`, `PlatformFamily` types from `platform.ts` are consumed in `InstallOnboarding.tsx`.
- `archiveCase`, `unarchiveCase` are new repository exports; CaseList imports both.
- The existing `Juror.status` enum already contains every state used; no schema migration required.
