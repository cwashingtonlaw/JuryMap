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
