import { db } from './db';
import { newId } from '../lib/id';
import { CURRENT_SCHEMA_VERSION } from '../types/schema';
import { deserializeCase } from '../lib/juryfile';
import { migrate } from './migrations';
import type { Case, CaseIndexRow, CustomFactor, Juror, JurorStatus, Panel, PeremptoryBudget } from '../types/case';
import type { VenireRow } from '../lib/venire-import';
import { makeEmptyJuror } from '../lib/panel';

export interface CreateCaseInput {
  name: string;
  docketNumber?: string;
  location?: string;
  judge?: string;
  trialDate?: string;
  targetJurors?: number;
  targetAlternates?: number;
  peremptoryBudget?: PeremptoryBudget;
  venireSize?: number;
  seatLayout?: 'rows' | 'snake';
  customFactors?: CustomFactor[];
  customColumns?: number;
  aisleAfterColumns?: number[];
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
      location: input.location,
      judge: input.judge,
      trialDate: input.trialDate,
      targetJurors: input.targetJurors ?? 12,
      targetAlternates: input.targetAlternates ?? 2,
      peremptoryBudget: input.peremptoryBudget ?? { defense: 12, state: 12 },
      venireSize: input.venireSize ?? 21,
      customColumns: input.customColumns,
      seatLayout: input.seatLayout ?? 'rows',
      customFactors: input.customFactors ?? [],
      aisleAfterColumns: input.aisleAfterColumns ?? [],
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
  const cap = c.meta.venireSize ?? 21;
  const limited = rows.slice(0, cap);
  panel.jurors = limited.map((row, i) => {
    const j = makeEmptyJuror(panel.id, i + 1);
    j.identity = {
      name: row.name,
      jurorNumber: row.jurorNumber,
      age: row.age,
      address: row.address,
      zip: row.zip,
    };
    if (row.race) j.demographics.race = row.race;
    if (row.gender) j.demographics.gender = row.gender;
    return j;
  });
  await saveCase(c);
}

export async function advanceToDecision(caseId: string): Promise<void> {
  const c = await getCase(caseId);
  if (!c) throw new Error(`Case ${caseId} not found`);
  const panel = c.panels[c.currentPanelIndex];
  const seated = panel.jurors.filter(
    (j) => j.seatIndex != null && (j.identity.name ?? '').trim()
  );
  const need = c.meta.venireSize ?? 21;
  if (seated.length !== need) {
    throw new Error(
      `Panel must have ${need} named seats before advancing to Decision.`
    );
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

export function seatedJurors(c: Case): Juror[] {
  return c.panels.flatMap((p) =>
    p.jurors.filter((j) => j.status === 'kept')
  );
}

export async function importCaseFromFile(payload: string): Promise<string> {
  const c = deserializeCase(payload);
  // Generate a new id to avoid clobbering an existing case with the same id
  const imported = { ...c, id: newId(), updatedAt: new Date().toISOString() };
  await saveCase(imported);
  return imported.id;
}

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
  if (newOrder.length !== kept.size || newOrder.some((id) => !kept.has(id))) {
    throw new Error('Order must contain every kept juror id exactly once');
  }
  c.seatedJurorOrder = newOrder;
  await saveCase(c);
}

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
