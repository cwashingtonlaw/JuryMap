# Jury Selection App — Milestone A: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a React 19 + Vite + TypeScript + Tailwind v4 PWA with Dexie-backed IndexedDB persistence, case management screens, and a working Questioning mode that can host a 21-juror panel. At the end of this milestone, the attorney can create a case, import a venire list (CSV/JSON), and take structured + freeform notes per juror on a 3×7 seating chart.

**Architecture:** Single-page React PWA, offline-first. Zustand store mirrors IndexedDB via a write-through `updateCase(mutator)` function. Data model is schema-versioned from day one. No backend, no network calls in-app.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind v4, Dexie (IndexedDB), Zustand, React Router v6, vite-plugin-pwa, Vitest, React Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-04-20-jury-selection-app-design.md`

---

## File Structure (at end of Milestone A)

```
Jury Selection/
├── .gitignore
├── .superpowers/                  (git-ignored)
├── docs/
│   └── superpowers/
│       ├── specs/2026-04-20-jury-selection-app-design.md
│       └── plans/2026-04-20-milestone-a-foundation.md
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts             (v4 uses CSS config; this is a stub)
├── postcss.config.js
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── manifest.webmanifest
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── routes.tsx
│   ├── types/
│   │   ├── case.ts                 (Case, Panel, Juror, enums)
│   │   ├── demographics.ts         (Race, Gender, MaritalStatus)
│   │   └── schema.ts               (schema version constants + migrations)
│   ├── db/
│   │   ├── db.ts                   (Dexie instance + tables)
│   │   ├── migrations.ts           (schema migration functions)
│   │   └── repository.ts           (case CRUD, venire import)
│   ├── store/
│   │   └── caseStore.ts            (Zustand store with write-through)
│   ├── lib/
│   │   ├── id.ts                   (uuid wrapper)
│   │   ├── venire-import.ts        (CSV/JSON parser)
│   │   └── panel.ts                (panel seat math: replace-in-seat, slide-left)
│   ├── screens/
│   │   ├── CaseList.tsx
│   │   ├── CaseSetup.tsx
│   │   └── Questioning.tsx
│   ├── components/
│   │   ├── SeatGrid.tsx
│   │   ├── SeatCard.tsx
│   │   ├── JurorDrawer.tsx
│   │   ├── JurorFields.tsx
│   │   ├── LeanControl.tsx
│   │   ├── FlagChips.tsx
│   │   └── DisqualifyModal.tsx
│   ├── hooks/
│   │   ├── useCase.ts              (subscribe to active case)
│   │   └── useKeyboardShortcuts.ts
│   └── test/
│       └── fixtures/
│           └── case-v1.json        (round-trip test fixture)
├── tests/
│   └── e2e/
│       └── questioning-flow.spec.ts
└── vitest.config.ts
```

---

## Phase 1 — Project scaffolding

### Task 1: Git init + .gitignore + commit design doc

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Initialize git repository**

Run:
```bash
cd "/Users/greatelephant82/Library/Mobile Documents/com~apple~CloudDocs/Claude Software Developer/Jury Selection"
git init -b main
```

Expected: `Initialized empty Git repository in .../Jury Selection/.git/`

- [ ] **Step 2: Create `.gitignore`**

Contents:
```gitignore
# Dependencies
node_modules/

# Build output
dist/
build/

# Environment
.env
.env.local
.env.*.local

# Editor / OS
.DS_Store
.vscode/
.idea/
*.swp

# Test output
coverage/
.nyc_output/
playwright-report/
test-results/

# Brainstorming scratch (superpowers)
.superpowers/

# macOS iCloud metadata
.icloud
.iCloud
*.icloud

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

- [ ] **Step 3: First commit — design doc and gitignore**

Run:
```bash
git add .gitignore docs/
git status
```

Expected: staged `.gitignore` and `docs/superpowers/specs/2026-04-20-jury-selection-app-design.md` and `docs/superpowers/plans/2026-04-20-milestone-a-foundation.md`.

```bash
git commit -m "chore: initial commit — design spec and Milestone A plan"
```

---

### Task 2: Scaffold Vite + React 19 + TypeScript

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`

- [ ] **Step 1: Create the Vite project**

Run:
```bash
npm create vite@latest . -- --template react-ts
```

When prompted about the non-empty directory, select "Ignore files and continue."

Expected: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/` scaffold created.

- [ ] **Step 2: Pin React 19 and TypeScript 5**

Edit `package.json` dependencies to:
```json
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
```

- [ ] **Step 3: Install dependencies**

Run:
```bash
npm install
```

Expected: dependencies installed without error.

- [ ] **Step 4: Verify dev server runs**

Run:
```bash
npm run dev
```

Expected: Vite prints `Local: http://localhost:5173/` (port may differ). Open the URL in a browser and see the Vite + React default page. Press `Ctrl+C` to stop.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React 19 + TypeScript"
```

---

### Task 3: Add Tailwind CSS v4

**Files:**
- Modify: `src/index.css`
- Modify: `vite.config.ts`
- Create: `postcss.config.js`

- [ ] **Step 1: Install Tailwind v4**

Run:
```bash
npm install -D tailwindcss@next @tailwindcss/vite@next
```

Expected: Tailwind v4 alpha/beta installed.

- [ ] **Step 2: Wire Tailwind into Vite**

Replace `vite.config.ts` with:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

- [ ] **Step 3: Replace default CSS with Tailwind v4 import**

Replace `src/index.css` with:
```css
@import "tailwindcss";

:root {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --card-paper: #fffbe6;
  --card-rule: #d9cfa0;
  --accent-state: #b91c1c;    /* red-700 */
  --accent-defense: #047857;  /* emerald-700 */
  --accent-neutral: #92400e;  /* amber-800 */
}

html, body, #root { height: 100%; }
body { @apply bg-slate-50 text-slate-900; }
```

- [ ] **Step 4: Replace App.tsx with a Tailwind smoke test**

Replace `src/App.tsx` with:
```tsx
export default function App() {
  return (
    <div className="min-h-full flex items-center justify-center">
      <h1 className="text-3xl font-semibold text-slate-800">
        Jury Selection — scaffold ready
      </h1>
    </div>
  );
}
```

- [ ] **Step 5: Run the dev server and verify Tailwind works**

Run:
```bash
npm run dev
```

Expected: the heading renders in slate-800, centered. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: add Tailwind CSS v4"
```

---

### Task 4: Configure the PWA

**Files:**
- Create: `public/manifest.webmanifest`
- Create: `public/icon-192.png`, `public/icon-512.png` (placeholder PNGs — real icons later)
- Modify: `vite.config.ts`
- Modify: `index.html`

- [ ] **Step 1: Install `vite-plugin-pwa`**

Run:
```bash
npm install -D vite-plugin-pwa
```

- [ ] **Step 2: Add placeholder icons**

Create `public/icon-192.png` and `public/icon-512.png` as solid-color placeholders (192×192 and 512×512 PNG, any color). You can generate them with ImageMagick:

```bash
# Only if ImageMagick is installed; otherwise download/copy any 192/512 PNG.
magick -size 192x192 xc:#1e293b public/icon-192.png
magick -size 512x512 xc:#1e293b public/icon-512.png
```

If ImageMagick isn't available, create empty files for now (Vite PWA will warn, but build will succeed):
```bash
touch public/icon-192.png public/icon-512.png
```

- [ ] **Step 3: Create the manifest**

Create `public/manifest.webmanifest`:
```json
{
  "name": "Jury Selection",
  "short_name": "Jury",
  "description": "Louisiana criminal voir dire companion",
  "start_url": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#ffffff",
  "theme_color": "#1e293b",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 4: Wire the plugin into Vite**

Replace `vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: false, // we ship our own manifest.webmanifest
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,ico,svg,webmanifest}'],
      },
    }),
  ],
});
```

- [ ] **Step 5: Reference manifest in `index.html`**

Modify `index.html` head to include:
```html
<link rel="manifest" href="/manifest.webmanifest" />
<meta name="theme-color" content="#1e293b" />
<link rel="apple-touch-icon" href="/icon-192.png" />
```

Also update the `<title>` to `Jury Selection`.

- [ ] **Step 6: Build and verify the service worker is generated**

Run:
```bash
npm run build
```

Expected: `dist/` contains `sw.js` and `workbox-*.js`. Build logs show `PWA v...` banner.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: configure vite-plugin-pwa and web manifest"
```

---

### Task 5: Configure Vitest + React Testing Library + Playwright

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Modify: `package.json` (add scripts)
- Create: `playwright.config.ts`
- Create: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Install test dependencies**

Run:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

- [ ] **Step 3: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
  ],
});
```

- [ ] **Step 5: Create a Playwright smoke test**

`tests/e2e/smoke.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('app shell renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /jury selection/i })).toBeVisible();
});
```

- [ ] **Step 6: Add test scripts to `package.json`**

In `package.json` `"scripts"`:
```json
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "typecheck": "tsc -b --noEmit"
```

- [ ] **Step 7: Run Vitest (should pass with zero tests)**

Run:
```bash
npm test
```

Expected: `No test files found`. That's fine — we'll add tests starting in Task 6.

- [ ] **Step 8: Run Playwright smoke test**

Run:
```bash
npm run test:e2e
```

Expected: 1 test passed (the scaffold heading visible).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: set up Vitest, React Testing Library, and Playwright"
```

---

## Phase 2 — Data model and persistence

### Task 6: Core type definitions

**Files:**
- Create: `src/types/demographics.ts`
- Create: `src/types/case.ts`

- [ ] **Step 1: Define demographic enums**

`src/types/demographics.ts`:
```ts
export type Race =
  | 'black'
  | 'white'
  | 'hispanic'
  | 'asian'
  | 'native-american'
  | 'pacific-islander'
  | 'other'
  | 'unknown';

export const RACE_LABELS: Record<Race, string> = {
  black: 'Black',
  white: 'White',
  hispanic: 'Hispanic',
  asian: 'Asian',
  'native-american': 'Native American',
  'pacific-islander': 'Pacific Islander',
  other: 'Other',
  unknown: 'Unknown',
};

export type Gender = 'male' | 'female' | 'nonbinary' | 'unknown';

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Male',
  female: 'Female',
  nonbinary: 'Nonbinary',
  unknown: 'Unknown',
};

export type MaritalStatus = 'M' | 'S' | 'D' | 'W' | 'unknown';

export const MARITAL_LABELS: Record<MaritalStatus, string> = {
  M: 'Married',
  S: 'Single',
  D: 'Divorced',
  W: 'Widowed',
  unknown: 'Unknown',
};
```

- [ ] **Step 2: Define Case / Panel / Juror types**

`src/types/case.ts`:
```ts
import type { Race, Gender, MaritalStatus } from './demographics';

export type CaseMode = 'questioning' | 'decision' | 'seated';
export type PanelStatus = 'questioning' | 'decided' | 'archived';

export type JurorStatus =
  | 'active'
  | 'disqualified'
  | 'kept'
  | 'struck-peremptory-defense'
  | 'struck-peremptory-state'
  | 'struck-cause-defense'
  | 'struck-cause-state'
  | 'excused-by-court';

export type Lean = -3 | -2 | -1 | 0 | 1 | 2 | 3;

export interface FlagEntry {
  value: boolean;
  note?: string;
}

export interface JurorFlags {
  priorJury: FlagEntry;
  crimeVictim: FlagEntry;
  leFamily: FlagEntry;
  leFriend: FlagEntry;
  arrestHx: FlagEntry;
  convictionHx: FlagEntry;
  hardship: FlagEntry;
}

export interface SeatMove {
  at: string; // ISO timestamp
  fromSeat: number | null;
  toSeat: number | null;
  reason: string;
  kind: 'replace-in-seat' | 'slide-left' | 'removed';
}

export interface Juror {
  id: string;
  panelId: string;

  seatIndex: number | null; // 1..21 or null if removed
  seatHistory: SeatMove[];

  identity: {
    name: string;
    jurorNumber?: string;
    age?: number;
    address?: string;
    zip?: string;
  };

  demographics: {
    race: Race;
    gender: Gender;
    maritalStatus: MaritalStatus;
    children?: number;
    education?: string;
  };

  employment: {
    employer?: string;
    jobTitle?: string;
    spouseEmployer?: string;
    spouseJobTitle?: string;
  };

  flags: JurorFlags;

  views: {
    burdenOfProof?: string;
    punishment?: string;
    other?: string;
  };

  demeanor?: string;
  notes: string; // markdown-capable free-form
  lean: Lean;

  status: JurorStatus;
  disqualificationReason?: string;
  strikeReason?: string;

  createdAt: string;
  updatedAt: string;
}

export interface Panel {
  id: string;
  index: number; // 1-based panel number within the case
  status: PanelStatus;
  jurors: Juror[];
  createdAt: string;
  decidedAt?: string;
}

export interface PeremptoryBudget {
  defense: number;
  state: number;
}

export interface CaseMeta {
  name: string;
  docketNumber?: string;
  parish?: string;
  judge?: string;
  trialDate?: string; // ISO date
  targetJurors: number;
  targetAlternates: number;
  peremptoryBudget: PeremptoryBudget;
}

export interface Case {
  id: string;
  schemaVersion: number;
  meta: CaseMeta;
  mode: CaseMode;
  currentPanelIndex: number; // 0-based into panels[]
  panels: Panel[];
  seatedJurorOrder: string[]; // juror IDs
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CaseIndexRow {
  id: string;
  name: string;
  archived: boolean;
  updatedAt: string;
}

export const DEFAULT_PEREMPTORY_PRESETS: Record<string, PeremptoryBudget> = {
  capital: { defense: 12, state: 12 },
  'felony-12': { defense: 12, state: 12 },
  'felony-6': { defense: 6, state: 6 },
};

export function emptyFlags(): JurorFlags {
  const blank = (): FlagEntry => ({ value: false });
  return {
    priorJury: blank(),
    crimeVictim: blank(),
    leFamily: blank(),
    leFriend: blank(),
    arrestHx: blank(),
    convictionHx: blank(),
    hardship: blank(),
  };
}
```

- [ ] **Step 3: Typecheck**

Run:
```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: core type definitions for Case / Panel / Juror"
```

---

### Task 7: Schema versioning + migrations

**Files:**
- Create: `src/types/schema.ts`
- Create: `src/db/migrations.ts`
- Create: `src/db/migrations.test.ts`
- Create: `src/test/fixtures/case-v1.json`

- [ ] **Step 1: Define schema version constant**

`src/types/schema.ts`:
```ts
export const CURRENT_SCHEMA_VERSION = 1;
```

- [ ] **Step 2: Write a failing test for the migration function**

`src/db/migrations.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { migrate } from './migrations';
import fixtureV1 from '../test/fixtures/case-v1.json';

describe('migrate', () => {
  it('returns v1 data unchanged', () => {
    const { migrated, appliedMigrations } = migrate(fixtureV1 as any, 1);
    expect(migrated).toEqual(fixtureV1);
    expect(appliedMigrations).toEqual([]);
  });

  it('throws when the file version is newer than supported', () => {
    const newer = { ...fixtureV1, schemaVersion: 99 };
    expect(() => migrate(newer as any, 1)).toThrow(
      /newer version of the app/i
    );
  });
});
```

- [ ] **Step 3: Create the v1 fixture**

`src/test/fixtures/case-v1.json`:
```json
{
  "id": "fixture-v1",
  "schemaVersion": 1,
  "meta": {
    "name": "Fixture case",
    "targetJurors": 12,
    "targetAlternates": 2,
    "peremptoryBudget": { "defense": 12, "state": 12 }
  },
  "mode": "questioning",
  "currentPanelIndex": 0,
  "panels": [],
  "seatedJurorOrder": [],
  "archived": false,
  "createdAt": "2026-04-20T00:00:00.000Z",
  "updatedAt": "2026-04-20T00:00:00.000Z"
}
```

- [ ] **Step 4: Run the test to verify failure**

Run:
```bash
npm test -- migrations
```

Expected: FAIL — `migrate` is not defined.

- [ ] **Step 5: Implement `migrate`**

`src/db/migrations.ts`:
```ts
import type { Case } from '../types/case';

type MigrationFn = (input: any) => any;

// Future migrations: add entries as { from: N, to: N+1, fn: ... }
const MIGRATIONS: Array<{ from: number; to: number; fn: MigrationFn }> = [];

export interface MigrationResult {
  migrated: Case;
  appliedMigrations: string[];
}

export function migrate(input: any, currentVersion: number): MigrationResult {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Invalid case payload: not an object');
  }
  const from = input.schemaVersion;
  if (typeof from !== 'number') {
    throw new Error('Invalid case payload: missing schemaVersion');
  }
  if (from > currentVersion) {
    throw new Error(
      `This file was saved by a newer version of the app (v${from}). Update before opening.`
    );
  }

  let data = input;
  const applied: string[] = [];
  for (const m of MIGRATIONS) {
    if (data.schemaVersion < m.to) {
      data = m.fn(data);
      data = { ...data, schemaVersion: m.to };
      applied.push(`v${m.from}→v${m.to}`);
    }
  }

  return { migrated: data as Case, appliedMigrations: applied };
}
```

- [ ] **Step 6: Re-run test**

Run:
```bash
npm test -- migrations
```

Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: schema versioning and migration scaffold"
```

---

### Task 8: Dexie database setup

**Files:**
- Create: `src/db/db.ts`
- Create: `src/db/repository.ts`
- Create: `src/db/repository.test.ts`
- Create: `src/lib/id.ts`

- [ ] **Step 1: Install Dexie and uuid**

Run:
```bash
npm install dexie uuid
npm install -D @types/uuid fake-indexeddb
```

- [ ] **Step 2: Create `src/lib/id.ts`**

```ts
import { v4 as uuidv4 } from 'uuid';
export function newId(): string {
  return uuidv4();
}
```

- [ ] **Step 3: Create the Dexie instance**

`src/db/db.ts`:
```ts
import Dexie, { type Table } from 'dexie';
import type { Case, CaseIndexRow } from '../types/case';

export interface CaseBlobRow {
  caseId: string;
  schemaVersion: number;
  data: Case;
  updatedAt: string;
}

export class JuryDB extends Dexie {
  cases!: Table<CaseIndexRow, string>;
  caseBlobs!: Table<CaseBlobRow, string>;

  constructor() {
    super('jury-selection');
    this.version(1).stores({
      cases: 'id, name, updatedAt, archived',
      caseBlobs: 'caseId',
    });
  }
}

export const db = new JuryDB();
```

- [ ] **Step 4: Write failing repository tests**

`src/db/repository.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import {
  createCase,
  getCase,
  listCases,
  saveCase,
  deleteCase,
} from './repository';

async function reset() {
  await db.delete();
  await db.open();
}

beforeEach(reset);

describe('repository', () => {
  it('creates a case and retrieves it', async () => {
    const created = await createCase({
      name: 'State v. Smith',
      targetJurors: 12,
      targetAlternates: 2,
      peremptoryBudget: { defense: 12, state: 12 },
    });
    const loaded = await getCase(created.id);
    expect(loaded?.meta.name).toBe('State v. Smith');
    expect(loaded?.schemaVersion).toBe(1);
    expect(loaded?.mode).toBe('questioning');
    expect(loaded?.panels.length).toBe(1); // first panel auto-created
  });

  it('lists cases in updatedAt-desc order', async () => {
    const a = await createCase({ name: 'A' });
    await new Promise((r) => setTimeout(r, 5));
    const b = await createCase({ name: 'B' });
    const rows = await listCases({ includeArchived: false });
    expect(rows.map((r) => r.id)).toEqual([b.id, a.id]);
  });

  it('saves case mutations via saveCase', async () => {
    const c = await createCase({ name: 'Original' });
    c.meta.name = 'Edited';
    await saveCase(c);
    const loaded = await getCase(c.id);
    expect(loaded?.meta.name).toBe('Edited');
  });

  it('deletes a case', async () => {
    const c = await createCase({ name: 'Doomed' });
    await deleteCase(c.id);
    expect(await getCase(c.id)).toBeUndefined();
  });
});
```

- [ ] **Step 5: Run test to verify failure**

Run:
```bash
npm test -- repository
```

Expected: FAIL — functions not defined.

- [ ] **Step 6: Implement the repository**

`src/db/repository.ts`:
```ts
import { db } from './db';
import { newId } from '../lib/id';
import { CURRENT_SCHEMA_VERSION } from '../types/schema';
import { migrate } from './migrations';
import type { Case, CaseIndexRow, Panel, PeremptoryBudget } from '../types/case';

export interface CreateCaseInput {
  name: string;
  docketNumber?: string;
  parish?: string;
  judge?: string;
  trialDate?: string;
  targetJurors?: number;
  targetAlternates?: number;
  peremptoryBudget?: PeremptoryBudget;
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeEmptyPanel(index: number): Panel {
  return {
    id: newId(),
    index,
    status: 'questioning',
    jurors: [],
    createdAt: nowIso(),
  };
}

export async function createCase(input: CreateCaseInput): Promise<Case> {
  const now = nowIso();
  const id = newId();
  const c: Case = {
    id,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    meta: {
      name: input.name,
      docketNumber: input.docketNumber,
      parish: input.parish,
      judge: input.judge,
      trialDate: input.trialDate,
      targetJurors: input.targetJurors ?? 12,
      targetAlternates: input.targetAlternates ?? 2,
      peremptoryBudget: input.peremptoryBudget ?? { defense: 12, state: 12 },
    },
    mode: 'questioning',
    currentPanelIndex: 0,
    panels: [makeEmptyPanel(1)],
    seatedJurorOrder: [],
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
  await saveCase(c);
  return c;
}

export async function saveCase(c: Case): Promise<void> {
  const now = nowIso();
  const updated: Case = { ...c, updatedAt: now };
  await db.transaction('rw', db.cases, db.caseBlobs, async () => {
    await db.cases.put({
      id: updated.id,
      name: updated.meta.name,
      archived: updated.archived,
      updatedAt: now,
    });
    await db.caseBlobs.put({
      caseId: updated.id,
      schemaVersion: updated.schemaVersion,
      data: updated,
      updatedAt: now,
    });
  });
}

export async function getCase(id: string): Promise<Case | undefined> {
  const row = await db.caseBlobs.get(id);
  if (!row) return undefined;
  const { migrated } = migrate(row.data, CURRENT_SCHEMA_VERSION);
  return migrated;
}

export interface ListOptions {
  includeArchived: boolean;
}

export async function listCases(opts: ListOptions): Promise<CaseIndexRow[]> {
  const all = await db.cases.orderBy('updatedAt').reverse().toArray();
  return opts.includeArchived ? all : all.filter((r) => !r.archived);
}

export async function deleteCase(id: string): Promise<void> {
  await db.transaction('rw', db.cases, db.caseBlobs, async () => {
    await db.cases.delete(id);
    await db.caseBlobs.delete(id);
  });
}
```

- [ ] **Step 7: Re-run test**

Run:
```bash
npm test -- repository
```

Expected: PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: Dexie database and case repository"
```

---

### Task 9: Zustand store with write-through

**Files:**
- Create: `src/store/caseStore.ts`
- Create: `src/store/caseStore.test.ts`

- [ ] **Step 1: Install Zustand**

Run:
```bash
npm install zustand
```

- [ ] **Step 2: Write failing store tests**

`src/store/caseStore.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '../db/db';
import { createCase } from '../db/repository';
import { useCaseStore } from './caseStore';

beforeEach(async () => {
  await db.delete();
  await db.open();
  useCaseStore.setState({ activeCase: null });
});

describe('caseStore', () => {
  it('loads a case by id', async () => {
    const c = await createCase({ name: 'Loaded' });
    await useCaseStore.getState().loadCase(c.id);
    expect(useCaseStore.getState().activeCase?.id).toBe(c.id);
  });

  it('updateCase writes through to IndexedDB', async () => {
    const c = await createCase({ name: 'Original' });
    await useCaseStore.getState().loadCase(c.id);
    await useCaseStore.getState().updateCase((draft) => {
      draft.meta.name = 'Renamed';
    });
    expect(useCaseStore.getState().activeCase?.meta.name).toBe('Renamed');
    // Reload fresh from DB
    useCaseStore.setState({ activeCase: null });
    await useCaseStore.getState().loadCase(c.id);
    expect(useCaseStore.getState().activeCase?.meta.name).toBe('Renamed');
  });

  it('updateCase throws when no case is loaded', async () => {
    await expect(
      useCaseStore.getState().updateCase(() => {})
    ).rejects.toThrow(/no active case/i);
  });
});
```

- [ ] **Step 3: Run test to verify failure**

Run:
```bash
npm test -- caseStore
```

Expected: FAIL — store not defined.

- [ ] **Step 4: Install Immer for immutable updates**

Run:
```bash
npm install immer
```

- [ ] **Step 5: Implement the store**

`src/store/caseStore.ts`:
```ts
import { create } from 'zustand';
import { produce } from 'immer';
import type { Case } from '../types/case';
import { getCase, saveCase } from '../db/repository';

interface CaseStore {
  activeCase: Case | null;
  loadCase: (id: string) => Promise<void>;
  updateCase: (mutator: (draft: Case) => void) => Promise<void>;
  clear: () => void;
}

export const useCaseStore = create<CaseStore>((set, get) => ({
  activeCase: null,

  loadCase: async (id) => {
    const c = await getCase(id);
    if (!c) throw new Error(`Case ${id} not found`);
    set({ activeCase: c });
  },

  updateCase: async (mutator) => {
    const current = get().activeCase;
    if (!current) throw new Error('No active case');
    const next = produce(current, mutator);
    // Write through in the same tick before setting state
    await saveCase(next);
    set({ activeCase: next });
  },

  clear: () => set({ activeCase: null }),
}));
```

- [ ] **Step 6: Re-run tests**

Run:
```bash
npm test -- caseStore
```

Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: Zustand caseStore with write-through persistence"
```

---

### Task 10: Panel math — replace-in-seat and slide-left

**Files:**
- Create: `src/lib/panel.ts`
- Create: `src/lib/panel.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/panel.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { replaceInSeat, slideLeft, makeEmptyJuror } from './panel';
import type { Panel, Juror } from '../types/case';

function juror(seat: number, name: string): Juror {
  const now = new Date().toISOString();
  return {
    ...makeEmptyJuror('panel-1'),
    identity: { name },
    seatIndex: seat,
    createdAt: now,
    updatedAt: now,
  };
}

function panel(jurors: Juror[]): Panel {
  return {
    id: 'panel-1',
    index: 1,
    status: 'questioning',
    jurors,
    createdAt: new Date().toISOString(),
  };
}

describe('replaceInSeat', () => {
  it('removes the disqualified juror and places a new juror in the same seat', () => {
    const p = panel([juror(1, 'Alice'), juror(2, 'Bob'), juror(3, 'Carla')]);
    const { panel: next, newJuror } = replaceInSeat(p, 'Alice', 'hardship');
    const alice = next.jurors.find((j) => j.identity.name === 'Alice')!;
    expect(alice.status).toBe('disqualified');
    expect(alice.seatIndex).toBeNull();
    expect(alice.disqualificationReason).toBe('hardship');
    expect(alice.seatHistory.at(-1)).toMatchObject({
      fromSeat: 1,
      toSeat: null,
      kind: 'replace-in-seat',
    });
    expect(newJuror.seatIndex).toBe(1);
    expect(next.jurors.find((j) => j.id === newJuror.id)).toBeDefined();
  });

  it('throws when the juror id is not found', () => {
    const p = panel([juror(1, 'Alice')]);
    expect(() => replaceInSeat(p, 'nope', 'x')).toThrow(/not found/i);
  });
});

describe('slideLeft', () => {
  it('shifts jurors left to close the gap left by a disqualified juror', () => {
    const p = panel([
      juror(1, 'Alice'),
      juror(2, 'Bob'),
      juror(3, 'Carla'),
      juror(4, 'Dan'),
    ]);
    const bob = p.jurors.find((j) => j.identity.name === 'Bob')!;
    const { panel: next } = slideLeft(p, bob.id, 'cause on face');
    expect(next.jurors.find((j) => j.identity.name === 'Bob')!.status).toBe(
      'disqualified'
    );
    expect(next.jurors.find((j) => j.identity.name === 'Carla')!.seatIndex).toBe(
      2
    );
    expect(next.jurors.find((j) => j.identity.name === 'Dan')!.seatIndex).toBe(
      3
    );
    expect(next.jurors.find((j) => j.identity.name === 'Alice')!.seatIndex).toBe(
      1
    );
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:
```bash
npm test -- panel
```

Expected: FAIL — functions not defined.

- [ ] **Step 3: Implement the panel math**

`src/lib/panel.ts`:
```ts
import { newId } from './id';
import { emptyFlags } from '../types/case';
import type { Juror, Panel, SeatMove } from '../types/case';

export function makeEmptyJuror(panelId: string, seatIndex: number | null = null): Juror {
  const now = new Date().toISOString();
  return {
    id: newId(),
    panelId,
    seatIndex,
    seatHistory: [],
    identity: { name: '' },
    demographics: {
      race: 'unknown',
      gender: 'unknown',
      maritalStatus: 'unknown',
    },
    employment: {},
    flags: emptyFlags(),
    views: {},
    notes: '',
    lean: 0,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

function findById(p: Panel, id: string): Juror {
  const j = p.jurors.find((x) => x.id === id);
  if (!j) throw new Error(`Juror ${id} not found in panel ${p.id}`);
  return j;
}

function tsNow(): string {
  return new Date().toISOString();
}

export interface ReplaceResult {
  panel: Panel;
  newJuror: Juror;
}

export function replaceInSeat(
  panel: Panel,
  disqualifiedJurorId: string,
  reason: string
): ReplaceResult {
  const target = findById(panel, disqualifiedJurorId);
  if (target.seatIndex == null) {
    throw new Error('Juror has no seat; cannot replace-in-seat');
  }
  const seat = target.seatIndex;
  const now = tsNow();

  const move: SeatMove = {
    at: now,
    fromSeat: seat,
    toSeat: null,
    reason,
    kind: 'replace-in-seat',
  };

  const disqualified: Juror = {
    ...target,
    status: 'disqualified',
    seatIndex: null,
    seatHistory: [...target.seatHistory, move],
    disqualificationReason: reason,
    updatedAt: now,
  };

  const newJuror = makeEmptyJuror(panel.id, seat);

  const jurors = panel.jurors.map((j) => (j.id === target.id ? disqualified : j));
  jurors.push(newJuror);

  return {
    panel: { ...panel, jurors },
    newJuror,
  };
}

export function slideLeft(
  panel: Panel,
  disqualifiedJurorId: string,
  reason: string
): { panel: Panel } {
  const target = findById(panel, disqualifiedJurorId);
  if (target.seatIndex == null) {
    throw new Error('Juror has no seat; cannot slide-left');
  }
  const gap = target.seatIndex;
  const now = tsNow();

  const disqualified: Juror = {
    ...target,
    status: 'disqualified',
    seatIndex: null,
    disqualificationReason: reason,
    seatHistory: [
      ...target.seatHistory,
      { at: now, fromSeat: gap, toSeat: null, reason, kind: 'slide-left' },
    ],
    updatedAt: now,
  };

  const nextJurors: Juror[] = panel.jurors.map((j) => {
    if (j.id === target.id) return disqualified;
    if (j.seatIndex != null && j.seatIndex > gap) {
      const newSeat = j.seatIndex - 1;
      return {
        ...j,
        seatIndex: newSeat,
        seatHistory: [
          ...j.seatHistory,
          {
            at: now,
            fromSeat: j.seatIndex,
            toSeat: newSeat,
            reason: `slide-left after ${target.identity.name || 'juror'} disqualified`,
            kind: 'slide-left',
          },
        ],
        updatedAt: now,
      };
    }
    return j;
  });

  return { panel: { ...panel, jurors: nextJurors } };
}
```

- [ ] **Step 4: Re-run test**

Run:
```bash
npm test -- panel
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: panel seat math (replace-in-seat, slide-left)"
```

---

## Phase 3 — Case management UI

### Task 11: App shell + React Router

**Files:**
- Create: `src/routes.tsx`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Create: `src/screens/CaseList.tsx` (stub)
- Create: `src/screens/CaseSetup.tsx` (stub)
- Create: `src/screens/Questioning.tsx` (stub)

- [ ] **Step 1: Install React Router**

Run:
```bash
npm install react-router-dom
```

- [ ] **Step 2: Create screen stubs**

`src/screens/CaseList.tsx`:
```tsx
export default function CaseList() {
  return <div className="p-8"><h1 className="text-2xl font-semibold">Cases</h1></div>;
}
```

`src/screens/CaseSetup.tsx`:
```tsx
export default function CaseSetup() {
  return <div className="p-8"><h1 className="text-2xl font-semibold">New Case</h1></div>;
}
```

`src/screens/Questioning.tsx`:
```tsx
export default function Questioning() {
  return <div className="p-8"><h1 className="text-2xl font-semibold">Questioning</h1></div>;
}
```

- [ ] **Step 3: Create the router**

`src/routes.tsx`:
```tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import CaseList from './screens/CaseList';
import CaseSetup from './screens/CaseSetup';
import Questioning from './screens/Questioning';

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/cases" replace /> },
  { path: '/cases', element: <CaseList /> },
  { path: '/cases/new', element: <CaseSetup /> },
  { path: '/cases/:caseId/questioning', element: <Questioning /> },
]);
```

- [ ] **Step 4: Wire the router into `App.tsx`**

`src/App.tsx`:
```tsx
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

export default function App() {
  return <RouterProvider router={router} />;
}
```

- [ ] **Step 5: Run dev server and verify navigation**

Run:
```bash
npm run dev
```

Expected: `/` redirects to `/cases`. Manually navigating to `/cases/new` shows "New Case." Stop server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: app shell with React Router and screen stubs"
```

---

### Task 12: Case List screen

**Files:**
- Modify: `src/screens/CaseList.tsx`
- Create: `src/screens/CaseList.test.tsx`

- [ ] **Step 1: Write a failing test**

`src/screens/CaseList.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../db/db';
import { createCase } from '../db/repository';
import CaseList from './CaseList';

async function reset() {
  await db.delete();
  await db.open();
}
beforeEach(reset);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/cases" element={<CaseList />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('CaseList', () => {
  it('shows an empty state when there are no cases', async () => {
    renderAt('/cases');
    expect(await screen.findByText(/no cases yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /new case/i })).toBeInTheDocument();
  });

  it('renders a row per case', async () => {
    await createCase({ name: 'State v. Alpha' });
    await createCase({ name: 'State v. Beta' });
    renderAt('/cases');
    expect(await screen.findByText('State v. Alpha')).toBeInTheDocument();
    expect(await screen.findByText('State v. Beta')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:
```bash
npm test -- CaseList
```

Expected: FAIL.

- [ ] **Step 3: Implement CaseList**

`src/screens/CaseList.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCases } from '../db/repository';
import type { CaseIndexRow } from '../types/case';

export default function CaseList() {
  const [rows, setRows] = useState<CaseIndexRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listCases({ includeArchived: false }).then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (rows === null) return <div className="p-8 text-slate-500">Loading…</div>;

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cases</h1>
        <Link
          to="/cases/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          New Case
        </Link>
      </header>

      <div className="p-8">
        {rows.length === 0 ? (
          <div className="text-slate-500">
            No cases yet. Create one to get started.
          </div>
        ) : (
          <ul className="grid gap-3">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/cases/${r.id}/questioning`}
                  className="block rounded-md border border-slate-200 bg-white px-4 py-3 hover:border-slate-400"
                >
                  <div className="font-medium text-slate-900">{r.name}</div>
                  <div className="text-xs text-slate-500">
                    Last edited {new Date(r.updatedAt).toLocaleString()}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Re-run tests**

Run:
```bash
npm test -- CaseList
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Case List screen with empty state and case rows"
```

---

### Task 13: Case Setup screen

**Files:**
- Modify: `src/screens/CaseSetup.tsx`
- Create: `src/screens/CaseSetup.test.tsx`

- [ ] **Step 1: Write a failing test**

`src/screens/CaseSetup.test.tsx`:
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../db/db';
import CaseSetup from './CaseSetup';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/cases/new" element={<CaseSetup />} />
        <Route
          path="/cases/:id/questioning"
          element={<div data-testid="questioning">Questioning</div>}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('CaseSetup', () => {
  it('creates a case and navigates to its Questioning mode', async () => {
    const user = userEvent.setup();
    renderAt('/cases/new');
    await user.type(screen.getByLabelText(/case name/i), 'State v. Smith');
    await user.click(screen.getByRole('button', { name: /create case/i }));
    expect(await screen.findByTestId('questioning')).toBeInTheDocument();
  });

  it('requires a case name', async () => {
    const user = userEvent.setup();
    renderAt('/cases/new');
    await user.click(screen.getByRole('button', { name: /create case/i }));
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
  });

  it('applies the capital preset', async () => {
    const user = userEvent.setup();
    renderAt('/cases/new');
    await user.selectOptions(screen.getByLabelText(/peremptory preset/i), 'capital');
    const defenseInput = screen.getByLabelText(
      /defense peremptories/i
    ) as HTMLInputElement;
    expect(defenseInput.value).toBe('12');
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:
```bash
npm test -- CaseSetup
```

Expected: FAIL.

- [ ] **Step 3: Implement CaseSetup**

`src/screens/CaseSetup.tsx`:
```tsx
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCase } from '../db/repository';
import { DEFAULT_PEREMPTORY_PRESETS } from '../types/case';

type PresetKey = keyof typeof DEFAULT_PEREMPTORY_PRESETS | 'custom';

export default function CaseSetup() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [docketNumber, setDocket] = useState('');
  const [parish, setParish] = useState('');
  const [judge, setJudge] = useState('');
  const [trialDate, setTrialDate] = useState('');
  const [targetJurors, setTargetJurors] = useState(12);
  const [targetAlternates, setTargetAlternates] = useState(2);
  const [preset, setPreset] = useState<PresetKey>('felony-12');
  const [defensePer, setDefensePer] = useState(12);
  const [statePer, setStatePer] = useState(12);
  const [error, setError] = useState<string | null>(null);

  function onPresetChange(next: PresetKey) {
    setPreset(next);
    if (next !== 'custom') {
      const p = DEFAULT_PEREMPTORY_PRESETS[next];
      setDefensePer(p.defense);
      setStatePer(p.state);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    const c = await createCase({
      name: name.trim(),
      docketNumber: docketNumber.trim() || undefined,
      parish: parish.trim() || undefined,
      judge: judge.trim() || undefined,
      trialDate: trialDate || undefined,
      targetJurors,
      targetAlternates,
      peremptoryBudget: { defense: defensePer, state: statePer },
    });
    nav(`/cases/${c.id}/questioning`);
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white px-8 py-4">
        <h1 className="text-2xl font-semibold">New Case</h1>
      </header>

      <form className="max-w-2xl p-8 grid gap-4" onSubmit={onSubmit}>
        <label className="grid gap-1">
          <span className="text-sm font-medium">Case name</span>
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="State v. Smith"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-medium">Docket #</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              value={docketNumber}
              onChange={(e) => setDocket(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Trial date</span>
            <input
              type="date"
              className="rounded-md border border-slate-300 px-3 py-2"
              value={trialDate}
              onChange={(e) => setTrialDate(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Parish</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              value={parish}
              onChange={(e) => setParish(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Judge</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              value={judge}
              onChange={(e) => setJudge(e.target.value)}
            />
          </label>
        </div>

        <fieldset className="grid gap-3 border border-slate-200 rounded-md p-4">
          <legend className="text-sm font-medium px-1">Jury composition</legend>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1">
              <span className="text-sm">Target jurors</span>
              <input
                type="number"
                min={6}
                max={12}
                className="rounded-md border border-slate-300 px-3 py-2"
                value={targetJurors}
                onChange={(e) => setTargetJurors(parseInt(e.target.value) || 12)}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Target alternates</span>
              <input
                type="number"
                min={0}
                max={6}
                className="rounded-md border border-slate-300 px-3 py-2"
                value={targetAlternates}
                onChange={(e) =>
                  setTargetAlternates(parseInt(e.target.value) || 0)
                }
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="grid gap-3 border border-slate-200 rounded-md p-4">
          <legend className="text-sm font-medium px-1">Peremptory strikes</legend>
          <label className="grid gap-1">
            <span className="text-sm">Peremptory preset</span>
            <select
              className="rounded-md border border-slate-300 px-3 py-2"
              value={preset}
              onChange={(e) => onPresetChange(e.target.value as PresetKey)}
            >
              <option value="capital">Capital (12 per side)</option>
              <option value="felony-12">Felony, 12-juror (12 per side)</option>
              <option value="felony-6">Felony, 6-juror (6 per side)</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1">
              <span className="text-sm">Defense peremptories</span>
              <input
                type="number"
                min={0}
                max={24}
                className="rounded-md border border-slate-300 px-3 py-2"
                value={defensePer}
                onChange={(e) => {
                  setDefensePer(parseInt(e.target.value) || 0);
                  setPreset('custom');
                }}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">State peremptories</span>
              <input
                type="number"
                min={0}
                max={24}
                className="rounded-md border border-slate-300 px-3 py-2"
                value={statePer}
                onChange={(e) => {
                  setStatePer(parseInt(e.target.value) || 0);
                  setPreset('custom');
                }}
              />
            </label>
          </div>
        </fieldset>

        {error && (
          <div role="alert" className="text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Create Case
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Re-run tests**

Run:
```bash
npm test -- CaseSetup
```

Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Case Setup screen with preset peremptory budgets"
```

---

### Task 14: CSV/JSON venire import parser

**Files:**
- Create: `src/lib/venire-import.ts`
- Create: `src/lib/venire-import.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/venire-import.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseVenire } from './venire-import';

describe('parseVenire', () => {
  it('parses CSV with headers: name, juror_number', () => {
    const csv = 'name,juror_number\nAlice Jones,101\nBob Smith,102';
    const { rows, errors } = parseVenire(csv);
    expect(errors).toEqual([]);
    expect(rows.map((r) => r.name)).toEqual(['Alice Jones', 'Bob Smith']);
    expect(rows[0].jurorNumber).toBe('101');
  });

  it('parses JSON array', () => {
    const json = JSON.stringify([
      { name: 'Alice', juror_number: '1' },
      { name: 'Bob', jurorNumber: '2' },
    ]);
    const { rows, errors } = parseVenire(json);
    expect(errors).toEqual([]);
    expect(rows.length).toBe(2);
    expect(rows[0].jurorNumber).toBe('1');
    expect(rows[1].jurorNumber).toBe('2');
  });

  it('reports a clear error on malformed input', () => {
    const { rows, errors } = parseVenire('this is not csv or json!');
    expect(rows).toEqual([]);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('skips empty rows silently', () => {
    const csv = 'name\nAlice\n\n\nBob\n';
    const { rows, errors } = parseVenire(csv);
    expect(errors).toEqual([]);
    expect(rows.map((r) => r.name)).toEqual(['Alice', 'Bob']);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run:
```bash
npm test -- venire-import
```

Expected: FAIL.

- [ ] **Step 3: Implement the parser**

`src/lib/venire-import.ts`:
```ts
export interface VenireRow {
  name: string;
  jurorNumber?: string;
  age?: number;
  address?: string;
  zip?: string;
}

export interface ParseResult {
  rows: VenireRow[];
  errors: string[];
}

export function parseVenire(input: string): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { rows: [], errors: ['Input is empty'] };

  // Try JSON first
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return parseJson(trimmed);
  }
  return parseCsv(trimmed);
}

function parseJson(s: string): ParseResult {
  try {
    const parsed = JSON.parse(s);
    const arr = Array.isArray(parsed) ? parsed : [parsed];
    const rows: VenireRow[] = [];
    const errors: string[] = [];
    arr.forEach((entry, i) => {
      if (typeof entry !== 'object' || entry === null) {
        errors.push(`Row ${i + 1}: not an object`);
        return;
      }
      const name = (entry.name ?? entry.Name ?? '').toString().trim();
      if (!name) {
        errors.push(`Row ${i + 1}: missing name`);
        return;
      }
      rows.push({
        name,
        jurorNumber:
          entry.jurorNumber?.toString() ??
          entry.juror_number?.toString() ??
          undefined,
        age:
          typeof entry.age === 'number'
            ? entry.age
            : parseInt(entry.age) || undefined,
        address: entry.address ?? undefined,
        zip: entry.zip?.toString() ?? entry.zipcode?.toString() ?? undefined,
      });
    });
    return { rows, errors };
  } catch (e) {
    return {
      rows: [],
      errors: [`Invalid JSON: ${(e as Error).message}`],
    };
  }
}

function parseCsv(s: string): ParseResult {
  const lines = s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { rows: [], errors: ['No lines'] };

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  // Sanity: must contain a name-ish column
  const nameIdx = header.findIndex((h) => h === 'name');
  if (nameIdx === -1) {
    return {
      rows: [],
      errors: [
        'CSV header must include a "name" column. Got: ' + header.join(', '),
      ],
    };
  }
  const numIdx = header.findIndex(
    (h) => h === 'juror_number' || h === 'jurornumber' || h === 'juror#'
  );
  const ageIdx = header.findIndex((h) => h === 'age');
  const addrIdx = header.findIndex((h) => h === 'address');
  const zipIdx = header.findIndex((h) => h === 'zip' || h === 'zipcode');

  const rows: VenireRow[] = [];
  const errors: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const name = (cells[nameIdx] ?? '').trim();
    if (!name) continue;
    rows.push({
      name,
      jurorNumber: numIdx >= 0 ? cells[numIdx]?.trim() || undefined : undefined,
      age: ageIdx >= 0 ? parseInt(cells[ageIdx]) || undefined : undefined,
      address: addrIdx >= 0 ? cells[addrIdx]?.trim() || undefined : undefined,
      zip: zipIdx >= 0 ? cells[zipIdx]?.trim() || undefined : undefined,
    });
  }
  return { rows, errors };
}

function splitCsvLine(line: string): string[] {
  // Minimal CSV parser: supports quoted fields with embedded commas.
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') {
        out.push(cur);
        cur = '';
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out;
}
```

- [ ] **Step 4: Re-run tests**

Run:
```bash
npm test -- venire-import
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: CSV/JSON venire import parser"
```

---

### Task 15: Venire import in Case Setup

**Files:**
- Modify: `src/screens/CaseSetup.tsx`
- Modify: `src/db/repository.ts`
- Create: `src/db/repository.venire.test.ts`

- [ ] **Step 1: Write failing test for `populateFirstPanelFromVenire`**

`src/db/repository.venire.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from './db';
import {
  createCase,
  getCase,
  populateFirstPanelFromVenire,
} from './repository';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('populateFirstPanelFromVenire', () => {
  it('fills the first panel with up to 21 jurors', async () => {
    const c = await createCase({ name: 'Venire test' });
    const rows = Array.from({ length: 25 }).map((_, i) => ({
      name: `Juror ${i + 1}`,
      jurorNumber: String(100 + i),
    }));
    await populateFirstPanelFromVenire(c.id, rows);
    const loaded = await getCase(c.id);
    expect(loaded!.panels[0].jurors.length).toBe(21);
    expect(loaded!.panels[0].jurors[0].identity.name).toBe('Juror 1');
    expect(loaded!.panels[0].jurors[0].seatIndex).toBe(1);
    expect(loaded!.panels[0].jurors[20].seatIndex).toBe(21);
  });

  it('fills fewer seats when fewer rows given', async () => {
    const c = await createCase({ name: 'Short venire' });
    await populateFirstPanelFromVenire(c.id, [
      { name: 'Alice' },
      { name: 'Bob' },
    ]);
    const loaded = await getCase(c.id);
    expect(loaded!.panels[0].jurors.length).toBe(2);
    expect(loaded!.panels[0].jurors[1].seatIndex).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run:
```bash
npm test -- repository.venire
```

Expected: FAIL.

- [ ] **Step 3: Implement `populateFirstPanelFromVenire`**

Append to `src/db/repository.ts`:
```ts
import type { VenireRow } from '../lib/venire-import';
import { makeEmptyJuror } from '../lib/panel';

export async function populateFirstPanelFromVenire(
  caseId: string,
  rows: VenireRow[]
): Promise<void> {
  const c = await getCase(caseId);
  if (!c) throw new Error(`Case ${caseId} not found`);
  const panel = c.panels[0];
  if (!panel) throw new Error(`Case has no initial panel`);
  const limited = rows.slice(0, 21);
  panel.jurors = limited.map((row, i) => {
    const j = makeEmptyJuror(panel.id, i + 1);
    j.identity = {
      name: row.name,
      jurorNumber: row.jurorNumber,
      age: row.age,
      address: row.address,
      zip: row.zip,
    };
    return j;
  });
  await saveCase(c);
}
```

- [ ] **Step 4: Re-run tests**

Run:
```bash
npm test -- repository.venire
```

Expected: PASS.

- [ ] **Step 5: Wire venire import into Case Setup**

Modify `src/screens/CaseSetup.tsx`. Add these imports at top:
```tsx
import { parseVenire } from '../lib/venire-import';
import { populateFirstPanelFromVenire } from '../db/repository';
```

Add state inside the component:
```tsx
  const [venireText, setVenireText] = useState('');
  const [venireFeedback, setVenireFeedback] = useState<string | null>(null);
```

Replace the `onSubmit` body to import venire after case creation:
```tsx
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setVenireFeedback(null);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    const c = await createCase({
      name: name.trim(),
      docketNumber: docketNumber.trim() || undefined,
      parish: parish.trim() || undefined,
      judge: judge.trim() || undefined,
      trialDate: trialDate || undefined,
      targetJurors,
      targetAlternates,
      peremptoryBudget: { defense: defensePer, state: statePer },
    });
    if (venireText.trim()) {
      const { rows, errors } = parseVenire(venireText);
      if (errors.length) {
        setVenireFeedback(
          `Venire import had ${errors.length} issue(s): ${errors[0]}`
        );
        return;
      }
      await populateFirstPanelFromVenire(c.id, rows);
    }
    nav(`/cases/${c.id}/questioning`);
  }
```

Add a venire import fieldset to the form (just before the submit button):
```tsx
        <fieldset className="grid gap-3 border border-slate-200 rounded-md p-4">
          <legend className="text-sm font-medium px-1">
            Venire list (optional)
          </legend>
          <p className="text-xs text-slate-500">
            Paste CSV (with headers including <code>name</code>) or a JSON array.
            First 21 rows will be seated in the initial panel.
          </p>
          <textarea
            rows={6}
            className="rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
            value={venireText}
            onChange={(e) => setVenireText(e.target.value)}
            placeholder={`name,juror_number\nAlice Jones,101\nBob Smith,102`}
          />
          {venireFeedback && (
            <div role="alert" className="text-sm text-amber-700">
              {venireFeedback}
            </div>
          )}
        </fieldset>
```

- [ ] **Step 6: Verify the existing CaseSetup tests still pass**

Run:
```bash
npm test -- CaseSetup
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: venire list import in Case Setup"
```

---

## Phase 4 — Questioning mode

### Task 16: Seat grid + seat cards

**Files:**
- Create: `src/components/SeatGrid.tsx`
- Create: `src/components/SeatCard.tsx`
- Modify: `src/screens/Questioning.tsx`
- Create: `src/screens/Questioning.test.tsx`

- [ ] **Step 1: Write a failing test**

`src/screens/Questioning.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { db } from '../db/db';
import { createCase, populateFirstPanelFromVenire } from '../db/repository';
import Questioning from './Questioning';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

async function withCase() {
  const c = await createCase({ name: 'Test' });
  await populateFirstPanelFromVenire(
    c.id,
    Array.from({ length: 21 }).map((_, i) => ({ name: `Juror ${i + 1}` }))
  );
  return c;
}

function renderAt(caseId: string) {
  return render(
    <MemoryRouter initialEntries={[`/cases/${caseId}/questioning`]}>
      <Routes>
        <Route
          path="/cases/:caseId/questioning"
          element={<Questioning />}
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('Questioning', () => {
  it('renders 21 seat cards for a full panel', async () => {
    const c = await withCase();
    renderAt(c.id);
    for (let i = 1; i <= 21; i++) {
      expect(await screen.findByText(`Juror ${i}`)).toBeInTheDocument();
    }
  });

  it('renders 21 slots including empty ones', async () => {
    const c = await createCase({ name: 'Empty' });
    renderAt(c.id);
    const slots = await screen.findAllByTestId(/^seat-\d+$/);
    expect(slots.length).toBe(21);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run:
```bash
npm test -- Questioning
```

Expected: FAIL.

- [ ] **Step 3: Implement SeatCard**

`src/components/SeatCard.tsx`:
```tsx
import type { Juror } from '../types/case';

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

export default function SeatCard({ seat, juror, onClick }: Props) {
  return (
    <button
      type="button"
      data-testid={`seat-${seat}`}
      onClick={onClick}
      className={
        'text-left rounded-md bg-[var(--card-paper)] border border-[var(--card-rule)] ' +
        'p-2 min-h-32 border-l-4 ' +
        (juror ? LEAN_COLOR[juror.lean] : 'border-l-slate-200')
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
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-2">
        {juror?.demographics.maritalStatus &&
          juror.demographics.maritalStatus !== 'unknown' &&
          juror.demographics.maritalStatus}
      </div>
    </button>
  );
}
```

- [ ] **Step 4: Implement SeatGrid**

`src/components/SeatGrid.tsx`:
```tsx
import SeatCard from './SeatCard';
import type { Juror } from '../types/case';

interface Props {
  jurors: Juror[];
  onSeatClick?: (seat: number) => void;
}

export default function SeatGrid({ jurors, onSeatClick }: Props) {
  const bySeat = new Map<number, Juror>();
  for (const j of jurors) {
    if (j.seatIndex != null) bySeat.set(j.seatIndex, j);
  }
  return (
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 21 }).map((_, i) => {
        const seat = i + 1;
        return (
          <SeatCard
            key={seat}
            seat={seat}
            juror={bySeat.get(seat)}
            onClick={onSeatClick ? () => onSeatClick(seat) : undefined}
          />
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Implement Questioning**

`src/screens/Questioning.tsx`:
```tsx
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import SeatGrid from '../components/SeatGrid';

export default function Questioning() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);

  useEffect(() => {
    if (caseId) loadCase(caseId).catch(console.error);
  }, [caseId, loadCase]);

  if (!activeCase) return <div className="p-8 text-slate-500">Loading…</div>;

  const panel = activeCase.panels[activeCase.currentPanelIndex];
  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
          <div className="text-xs text-slate-500">
            Panel {panel.index} — Questioning
          </div>
        </div>
      </header>

      <div className="p-8">
        <SeatGrid jurors={panel.jurors} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Re-run tests**

Run:
```bash
npm test -- Questioning
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: seat grid and seat cards for Questioning mode"
```

---

### Task 17: Juror detail drawer (layout + field editors)

**Files:**
- Create: `src/components/JurorDrawer.tsx`
- Create: `src/components/JurorFields.tsx`
- Create: `src/components/LeanControl.tsx`
- Create: `src/components/FlagChips.tsx`
- Modify: `src/screens/Questioning.tsx`

- [ ] **Step 1: Implement LeanControl**

`src/components/LeanControl.tsx`:
```tsx
import type { Lean } from '../types/case';

interface Props {
  value: Lean;
  onChange: (value: Lean) => void;
}

const VALUES: Lean[] = [-3, -2, -1, 0, 1, 2, 3];

export default function LeanControl({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 items-center">
      <span className="text-xs text-red-700 w-14">State</span>
      {VALUES.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={
            'h-7 w-7 rounded-full text-xs font-semibold ' +
            (value === v
              ? v < 0
                ? 'bg-red-700 text-white'
                : v > 0
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-700 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
          }
          aria-label={`Set lean to ${v}`}
        >
          {v > 0 ? `+${v}` : v}
        </button>
      ))}
      <span className="text-xs text-emerald-700 w-16 text-right">Defense</span>
    </div>
  );
}
```

- [ ] **Step 2: Implement FlagChips**

`src/components/FlagChips.tsx`:
```tsx
import type { JurorFlags } from '../types/case';

interface Props {
  flags: JurorFlags;
  onToggle: (key: keyof JurorFlags) => void;
}

const FLAG_LABELS: Record<keyof JurorFlags, string> = {
  priorJury: 'Prior jury',
  crimeVictim: 'Crime victim',
  leFamily: 'LE family',
  leFriend: 'LE friend',
  arrestHx: 'Arrest hx',
  convictionHx: 'Conviction hx',
  hardship: 'Hardship',
};

export default function FlagChips({ flags, onToggle }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(FLAG_LABELS) as Array<keyof JurorFlags>).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onToggle(k)}
          className={
            'text-xs px-2 py-1 rounded-full border ' +
            (flags[k].value
              ? 'bg-amber-100 border-amber-400 text-amber-800'
              : 'bg-white border-slate-300 text-slate-500')
          }
        >
          {flags[k].value ? '✓ ' : ''}
          {FLAG_LABELS[k]}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Implement JurorFields**

`src/components/JurorFields.tsx`:
```tsx
import type { Juror, Lean } from '../types/case';
import { RACE_LABELS, GENDER_LABELS, MARITAL_LABELS } from '../types/demographics';
import LeanControl from './LeanControl';
import FlagChips from './FlagChips';

interface Props {
  juror: Juror;
  readOnly?: boolean;
  onChange: (mutator: (draft: Juror) => void) => void;
}

export default function JurorFields({ juror, readOnly, onChange }: Props) {
  function set<K extends keyof Juror>(key: K, value: Juror[K]) {
    onChange((d) => {
      (d as any)[key] = value;
    });
  }

  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-2" disabled={readOnly}>
        <legend className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Identity
        </legend>
        <input
          className="rounded-md border border-slate-300 px-3 py-2"
          placeholder="Name"
          value={juror.identity.name}
          onChange={(e) =>
            onChange((d) => {
              d.identity.name = e.target.value;
            })
          }
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Juror #"
            value={juror.identity.jurorNumber ?? ''}
            onChange={(e) =>
              onChange((d) => {
                d.identity.jurorNumber = e.target.value || undefined;
              })
            }
          />
          <input
            type="number"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Age"
            value={juror.identity.age ?? ''}
            onChange={(e) =>
              onChange((d) => {
                d.identity.age = parseInt(e.target.value) || undefined;
              })
            }
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Zip"
            value={juror.identity.zip ?? ''}
            onChange={(e) =>
              onChange((d) => {
                d.identity.zip = e.target.value || undefined;
              })
            }
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-2" disabled={readOnly}>
        <legend className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Demographics
        </legend>
        <div className="grid grid-cols-3 gap-2">
          <select
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
            value={juror.demographics.race}
            onChange={(e) =>
              onChange((d) => {
                d.demographics.race = e.target.value as any;
              })
            }
          >
            {Object.entries(RACE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
            value={juror.demographics.gender}
            onChange={(e) =>
              onChange((d) => {
                d.demographics.gender = e.target.value as any;
              })
            }
          >
            {Object.entries(GENDER_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
            value={juror.demographics.maritalStatus}
            onChange={(e) =>
              onChange((d) => {
                d.demographics.maritalStatus = e.target.value as any;
              })
            }
          >
            {Object.entries(MARITAL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset className="grid gap-2" disabled={readOnly}>
        <legend className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Employment
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Employer"
            value={juror.employment.employer ?? ''}
            onChange={(e) =>
              onChange((d) => {
                d.employment.employer = e.target.value || undefined;
              })
            }
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Job title"
            value={juror.employment.jobTitle ?? ''}
            onChange={(e) =>
              onChange((d) => {
                d.employment.jobTitle = e.target.value || undefined;
              })
            }
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-2" disabled={readOnly}>
        <legend className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Flags
        </legend>
        <FlagChips
          flags={juror.flags}
          onToggle={(k) =>
            onChange((d) => {
              d.flags[k].value = !d.flags[k].value;
            })
          }
        />
      </fieldset>

      <fieldset className="grid gap-2" disabled={readOnly}>
        <legend className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Lean
        </legend>
        <LeanControl
          value={juror.lean}
          onChange={(v: Lean) => set('lean', v)}
        />
      </fieldset>

      <fieldset className="grid gap-2" disabled={readOnly}>
        <legend className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Notes
        </legend>
        <textarea
          rows={6}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={juror.notes}
          onChange={(e) =>
            onChange((d) => {
              d.notes = e.target.value;
            })
          }
          placeholder="Demeanor, responses to questions, red flags…"
        />
      </fieldset>
    </div>
  );
}
```

- [ ] **Step 4: Implement JurorDrawer**

`src/components/JurorDrawer.tsx`:
```tsx
import { useEffect } from 'react';
import type { Juror } from '../types/case';
import JurorFields from './JurorFields';

interface Props {
  juror: Juror;
  readOnly?: boolean;
  onClose: () => void;
  onChange: (mutator: (draft: Juror) => void) => void;
  onDisqualify?: () => void;
}

export default function JurorDrawer({
  juror,
  readOnly,
  onClose,
  onChange,
  onDisqualify,
}: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-20 flex">
      <div
        className="flex-1 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="w-[420px] bg-white h-full overflow-y-auto shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Seat {juror.seatIndex ?? '—'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 text-sm"
          >
            Close (Esc)
          </button>
        </div>
        <JurorFields juror={juror} readOnly={readOnly} onChange={onChange} />
        {onDisqualify && juror.seatIndex != null && (
          <div className="mt-6 border-t border-slate-200 pt-4">
            <button
              onClick={onDisqualify}
              className="text-sm text-red-700 hover:text-red-900"
            >
              Disqualify juror…
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Wire drawer into Questioning**

Replace `src/screens/Questioning.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCaseStore } from '../store/caseStore';
import SeatGrid from '../components/SeatGrid';
import JurorDrawer from '../components/JurorDrawer';

export default function Questioning() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);
  const updateCase = useCaseStore((s) => s.updateCase);

  const [openSeat, setOpenSeat] = useState<number | null>(null);

  useEffect(() => {
    if (caseId) loadCase(caseId).catch(console.error);
  }, [caseId, loadCase]);

  if (!activeCase) return <div className="p-8 text-slate-500">Loading…</div>;

  const panel = activeCase.panels[activeCase.currentPanelIndex];
  const selectedJuror =
    openSeat != null
      ? panel.jurors.find((j) => j.seatIndex === openSeat)
      : undefined;

  async function patchJuror(mutator: (draft: any) => void) {
    const jurorId = selectedJuror?.id;
    if (!jurorId) return;
    await updateCase((draft) => {
      const p = draft.panels[draft.currentPanelIndex];
      const j = p.jurors.find((x) => x.id === jurorId);
      if (j) mutator(j);
    });
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
          <div className="text-xs text-slate-500">
            Panel {panel.index} — Questioning
          </div>
        </div>
      </header>

      <div className="p-8">
        <SeatGrid
          jurors={panel.jurors}
          onSeatClick={(s) => setOpenSeat(s)}
        />
      </div>

      {selectedJuror && (
        <JurorDrawer
          juror={selectedJuror}
          onClose={() => setOpenSeat(null)}
          onChange={patchJuror}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run all tests**

Run:
```bash
npm test
```

Expected: all existing tests PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: juror detail drawer with structured field editors"
```

---

### Task 18: Disqualification flow (replace-in-seat + slide-left)

**Files:**
- Create: `src/components/DisqualifyModal.tsx`
- Modify: `src/screens/Questioning.tsx`

- [ ] **Step 1: Implement DisqualifyModal**

`src/components/DisqualifyModal.tsx`:
```tsx
import { useState } from 'react';

export type DisqualifyKind = 'replace-in-seat' | 'slide-left';

interface Props {
  jurorName: string;
  onCancel: () => void;
  onConfirm: (kind: DisqualifyKind, reason: string) => void;
}

export default function DisqualifyModal({
  jurorName,
  onCancel,
  onConfirm,
}: Props) {
  const [kind, setKind] = useState<DisqualifyKind>('replace-in-seat');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!reason.trim()) {
      setError('A reason is required for the record.');
      return;
    }
    onConfirm(kind, reason.trim());
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-md shadow-xl p-6 w-[460px]">
        <h2 className="text-lg font-semibold mb-2">
          Disqualify {jurorName || 'juror'}
        </h2>
        <p className="text-sm text-slate-600 mb-4">
          Remove this juror from the panel. A written reason is required.
        </p>
        <fieldset className="grid gap-2 mb-4">
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="kind"
              checked={kind === 'replace-in-seat'}
              onChange={() => setKind('replace-in-seat')}
            />
            <span>
              <strong>Replace in seat</strong> (default) — a new juror fills
              this seat.
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              name="kind"
              checked={kind === 'slide-left'}
              onChange={() => setKind('slide-left')}
            />
            <span>
              <strong>Slide left</strong> — remaining jurors shift to close the
              gap.
            </span>
          </label>
        </fieldset>
        <label className="grid gap-1 mb-4">
          <span className="text-sm font-medium">Reason</span>
          <textarea
            rows={3}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Hardship / cause on face / …"
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
            className="px-3 py-2 text-sm rounded-md bg-red-700 text-white hover:bg-red-800"
          >
            Disqualify
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire modal and panel math into Questioning**

Modify `src/screens/Questioning.tsx`. Add imports:
```tsx
import DisqualifyModal, {
  type DisqualifyKind,
} from '../components/DisqualifyModal';
import { replaceInSeat, slideLeft } from '../lib/panel';
```

Add state + handlers inside the component (below existing state):
```tsx
  const [disqualifying, setDisqualifying] = useState<string | null>(null);

  async function disqualify(kind: DisqualifyKind, reason: string) {
    const jurorId = disqualifying;
    if (!jurorId) return;
    await updateCase((draft) => {
      const idx = draft.currentPanelIndex;
      const panel = draft.panels[idx];
      const fn = kind === 'replace-in-seat' ? replaceInSeat : slideLeft;
      const result = fn(panel, jurorId, reason);
      draft.panels[idx] = result.panel;
    });
    setDisqualifying(null);
    setOpenSeat(null);
  }
```

Pass `onDisqualify` to the drawer:
```tsx
      {selectedJuror && (
        <JurorDrawer
          juror={selectedJuror}
          onClose={() => setOpenSeat(null)}
          onChange={patchJuror}
          onDisqualify={() => setDisqualifying(selectedJuror.id)}
        />
      )}
      {disqualifying && selectedJuror && (
        <DisqualifyModal
          jurorName={selectedJuror.identity.name}
          onCancel={() => setDisqualifying(null)}
          onConfirm={disqualify}
        />
      )}
```

- [ ] **Step 3: Add end-to-end-ish test for disqualification**

Append to `src/screens/Questioning.test.tsx`:
```tsx
import userEvent from '@testing-library/user-event';

it('replace-in-seat moves the juror out and opens the seat for a new one', async () => {
  const c = await withCase();
  renderAt(c.id);
  const user = userEvent.setup();

  await user.click(await screen.findByText('Juror 1'));
  await user.click(screen.getByText(/disqualify juror/i));
  await user.type(screen.getByPlaceholderText(/hardship/i), 'hardship');
  await user.click(screen.getByRole('button', { name: /^disqualify$/i }));

  // Juror 1's card is still in the list (archived) but seat 1 is empty
  const seat1 = await screen.findByTestId('seat-1');
  expect(seat1.textContent).toMatch(/Empty/);
});
```

- [ ] **Step 4: Run tests**

Run:
```bash
npm test -- Questioning
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: mid-panel disqualification (replace-in-seat, slide-left) in Questioning mode"
```

---

### Task 19: Keyboard shortcuts for Questioning

**Files:**
- Create: `src/hooks/useKeyboardShortcuts.ts`
- Modify: `src/screens/Questioning.tsx`

- [ ] **Step 1: Implement the hook**

`src/hooks/useKeyboardShortcuts.ts`:
```ts
import { useEffect } from 'react';

export interface ShortcutMap {
  [key: string]: (ev: KeyboardEvent) => void;
}

export function useKeyboardShortcuts(map: ShortcutMap, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      // Don't hijack typing in inputs/textareas
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      const handler = map[e.key];
      if (handler) handler(e);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [map, enabled]);
}
```

- [ ] **Step 2: Wire keyboard shortcuts into Questioning**

In `src/screens/Questioning.tsx`, add import:
```tsx
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
```

Inside the component, add a seat-cycling shortcut when no drawer is open:
```tsx
  useKeyboardShortcuts(
    {
      ArrowRight: () => {
        if (openSeat == null) setOpenSeat(1);
        else setOpenSeat(Math.min(21, openSeat + 1));
      },
      ArrowLeft: () => {
        if (openSeat == null) return;
        setOpenSeat(Math.max(1, openSeat - 1));
      },
      ArrowDown: () => {
        if (openSeat == null) setOpenSeat(1);
        else setOpenSeat(Math.min(21, openSeat + 7));
      },
      ArrowUp: () => {
        if (openSeat == null) return;
        setOpenSeat(Math.max(1, openSeat - 7));
      },
    },
    true
  );
```

Inside the drawer, add lean shortcuts by extending the `onChange` handler pattern. Add after the `patchJuror` definition:
```tsx
  useKeyboardShortcuts(
    {
      '1': () => selectedJuror && patchJuror((d) => { d.lean = -3; }),
      '2': () => selectedJuror && patchJuror((d) => { d.lean = -2; }),
      '3': () => selectedJuror && patchJuror((d) => { d.lean = -1; }),
      '4': () => selectedJuror && patchJuror((d) => { d.lean = 0; }),
      '5': () => selectedJuror && patchJuror((d) => { d.lean = 1; }),
      '6': () => selectedJuror && patchJuror((d) => { d.lean = 2; }),
      '7': () => selectedJuror && patchJuror((d) => { d.lean = 3; }),
      v: () =>
        selectedJuror &&
        patchJuror((d) => {
          d.flags.crimeVictim.value = !d.flags.crimeVictim.value;
        }),
      l: () =>
        selectedJuror &&
        patchJuror((d) => {
          d.flags.leFamily.value = !d.flags.leFamily.value;
        }),
      p: () =>
        selectedJuror &&
        patchJuror((d) => {
          d.flags.priorJury.value = !d.flags.priorJury.value;
        }),
    },
    selectedJuror != null
  );
```

- [ ] **Step 3: Manual smoke test**

Run:
```bash
npm run dev
```

Create a new case, import 21 jurors via the textarea, navigate to Questioning, press arrow keys to cycle seats, open a juror, press `1` through `7` and watch the lean change, press `v/l/p` to toggle flags. Close the drawer, stop the server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: keyboard shortcuts for seat cycling, lean, and flags"
```

---

### Task 20: Mode transition guard (stub for Decision mode)

**Files:**
- Modify: `src/screens/Questioning.tsx`

- [ ] **Step 1: Add the "Finish Questioning" affordance**

In `src/screens/Questioning.tsx`, add a header button that validates panel readiness and shows a placeholder alert. Replace the header block with:
```tsx
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
          <div className="text-xs text-slate-500">
            Panel {panel.index} — Questioning
          </div>
        </div>
        <button
          type="button"
          disabled={!canFinishQuestioning(panel)}
          onClick={() =>
            alert(
              'Decision mode ships in Milestone B. All questioning notes are saved.'
            )
          }
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300"
        >
          Finish Questioning → Decision
        </button>
      </header>
```

Add the helper at the bottom of the file:
```tsx
function canFinishQuestioning(
  panel: ReturnType<typeof useCaseStore.getState>['activeCase'] extends infer C
    ? C extends null
      ? never
      : C extends { panels: infer P }
      ? P extends ReadonlyArray<infer U>
        ? U
        : never
      : never
    : never
): boolean {
  // Simpler: iterate panel.jurors directly.
  return (
    panel.jurors.filter(
      (j: any) => j.seatIndex != null && j.identity.name.trim()
    ).length === 21
  );
}
```

If the complex type annotation trips TypeScript, replace the function signature with `function canFinishQuestioning(panel: any): boolean` for this milestone — Milestone B will replace the placeholder with a real transition.

- [ ] **Step 2: Verify typecheck passes**

Run:
```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: Finish Questioning button with readiness guard (decision mode placeholder)"
```

---

### Task 21: End-to-end smoke test for Milestone A

**Files:**
- Modify: `tests/e2e/smoke.spec.ts`
- Create: `tests/e2e/questioning-flow.spec.ts`

- [ ] **Step 1: Replace the stale scaffold heading assertion**

Replace `tests/e2e/smoke.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('redirects from / to /cases and shows empty state', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/cases$/);
  await expect(page.getByText(/no cases yet/i)).toBeVisible();
});
```

- [ ] **Step 2: Add an end-to-end Questioning flow test**

`tests/e2e/questioning-flow.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('creates a case, imports venire, and takes notes', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/cases$/);
  await page.getByRole('link', { name: /new case/i }).click();

  await page.getByLabel(/case name/i).fill('E2E v. Demo');

  await page.getByLabel(/venire list/i).fill(
    `name,juror_number\nAlice Jones,101\nBob Smith,102\nCarla Doe,103`
  );

  await page.getByRole('button', { name: /create case/i }).click();

  // Now on Questioning screen
  await expect(page.getByText('E2E v. Demo')).toBeVisible();
  await expect(page.getByText('Alice Jones')).toBeVisible();
  await expect(page.getByText('Bob Smith')).toBeVisible();

  // Open Alice, add a note, close drawer
  await page.getByText('Alice Jones').click();
  await page.getByPlaceholder(/demeanor/i).fill('Polite, engaged');
  await page.keyboard.press('Escape');

  // Reopen and verify the note persisted
  await page.getByText('Alice Jones').click();
  await expect(page.getByPlaceholder(/demeanor/i)).toHaveValue(
    'Polite, engaged'
  );
});
```

- [ ] **Step 3: Run E2E**

Run:
```bash
npm run test:e2e
```

Expected: 2 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: E2E smoke + Questioning flow"
```

---

### Task 22: Milestone close — dry-run checklist

**Files:**
- Create: `docs/CHECKLIST-milestone-a.md`

- [ ] **Step 1: Create the close-out checklist**

`docs/CHECKLIST-milestone-a.md`:
```markdown
# Milestone A Close-out Checklist

- [ ] `npm run typecheck` — zero errors
- [ ] `npm test` — all unit tests pass
- [ ] `npm run test:e2e` — all Playwright tests pass
- [ ] `npm run build` — production build succeeds; `dist/sw.js` exists
- [ ] `npm run preview` — app loads, `/` redirects to `/cases`
- [ ] Manual walkthrough:
      - Create a case
      - Paste 21 venire rows (CSV)
      - Navigate to Questioning, all 21 seats filled
      - Open seat 5, edit every field, close drawer, reopen, verify persistence
      - Disqualify seat 3 with "Replace in seat" — seat 3 shows Empty; seat 4–21 unchanged
      - Disqualify seat 4 with "Slide left" — seat 4–20 shift left, seat 21 empty
      - Restart the browser tab, reopen the case — all changes persisted
- [ ] Device handoff:
      - (Laptop) save via `Ctrl+S` — will be implemented in Milestone B
      - For now, verify IndexedDB persistence only
- [ ] Commit any follow-ups; tag milestone
```

- [ ] **Step 2: Run each item and check it off as you go (manually)**

Work through the checklist. If anything fails, fix it before tagging.

- [ ] **Step 3: Tag the milestone**

Run:
```bash
git add -A
git commit -m "docs: Milestone A close-out checklist"
git tag milestone-a
```

---

## Self-review (performed after writing this plan)

**Spec coverage:**

- ✅ Solo-use, client-side PWA (Architecture covered in Tasks 2–5)
- ✅ Schema-versioned persistence (Task 7)
- ✅ Write-through Zustand store (Task 9)
- ✅ Dexie IndexedDB schema (Task 8)
- ✅ Case data model with all structured fields (Task 6)
- ✅ Replace-in-seat and slide-left math (Task 10)
- ✅ Case List + Case Setup with peremptory presets (Tasks 12, 13)
- ✅ CSV/JSON venire import with parser + repository wiring (Tasks 14, 15)
- ✅ Seat grid + juror cards (Task 16)
- ✅ Juror detail drawer with all structured fields + flags + lean + notes (Task 17)
- ✅ Disqualification UX (Task 18)
- ✅ Keyboard shortcuts 1–7 (lean), v/l/p (flags), arrow nav (Task 19)
- ⏭ Mode transition to Decision: stubbed with a readiness guard (Task 20) — full Decision mode is Milestone B
- ✅ Unit tests for all business-logic functions (migrations, repository, panel math, venire parse, store)
- ✅ Playwright E2E smoke + full Questioning flow (Task 21)

**Deferred to Milestone B (intentional):**
- Decision mode (strike picker, required `strikeReason`, live *Batson* tally, Peremptory Tracker right-rail)
- Seated Jury screen
- PDF export
- `.jury` file save/open

**Deferred to Milestone C (intentional):**
- Batson Analysis screen (cross-tab, disparate-treatment comparator, pattern flags, motion export)
- PWA install onboarding polish
- Help screen with pre-trial checklist

**Placeholder scan:** No TBD/TODO/FIXME in the plan itself. Task 20 uses an `alert()` explicitly as a placeholder for Milestone B, with a note saying so.

**Type consistency check:** `replaceInSeat`, `slideLeft`, `makeEmptyJuror`, `parseVenire`, `populateFirstPanelFromVenire`, `createCase`, `saveCase`, `getCase`, `listCases`, `deleteCase`, `useCaseStore.loadCase`, `useCaseStore.updateCase` — all consistent names across tasks. `Juror.status`, `JurorStatus`, `CaseMode`, `PanelStatus`, `Lean`, `FlagEntry`, `JurorFlags` — all defined in Task 6 and referenced consistently downstream.

**Known trade-offs for the reviewer:**
- Tests for React components focus on behavior not markup; they don't assert class names.
- CSV parser is a minimal implementation sufficient for venire lists; multi-line quoted fields are not supported (flagged if this becomes a real-world issue).
- Task 20 uses `any` for the panel readiness helper to avoid TS gymnastics; Milestone B will replace it when the real mode transition is built.
