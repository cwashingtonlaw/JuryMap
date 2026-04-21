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
