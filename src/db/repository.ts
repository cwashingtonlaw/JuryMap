import { db } from './db';
import { newId } from '../lib/id';
import { CURRENT_SCHEMA_VERSION } from '../types/schema';
import { migrate } from './migrations';
import type { Case, CaseIndexRow, Panel, PeremptoryBudget } from '../types/case';
import type { VenireRow } from '../lib/venire-import';
import { makeEmptyJuror } from '../lib/panel';

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
