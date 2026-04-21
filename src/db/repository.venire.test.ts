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

  it('respects a smaller venireSize', async () => {
    const c = await createCase({ name: 'Six', venireSize: 6 });
    const rows = Array.from({ length: 25 }).map((_, i) => ({
      name: `Juror ${i + 1}`,
    }));
    await populateFirstPanelFromVenire(c.id, rows);
    const loaded = await getCase(c.id);
    expect(loaded!.panels[0].jurors.length).toBe(6);
  });
});
