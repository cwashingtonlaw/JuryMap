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
    expect(loaded?.schemaVersion).toBe(4);
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
