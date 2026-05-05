import { describe, it, expect } from 'vitest';
import { replaceInSeat, slideLeft, swapSeats, makeEmptyJuror, calcCutoffSeat } from './panel';
import type { Case, Panel, Juror, JurorStatus } from '../types/case';

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
    const alice = p.jurors.find((j) => j.identity.name === 'Alice')!;
    const { panel: next, newJuror } = replaceInSeat(p, alice.id, 'hardship');
    const aliceAfter = next.jurors.find((j) => j.identity.name === 'Alice')!;
    expect(aliceAfter.status).toBe('disqualified');
    expect(aliceAfter.seatIndex).toBeNull();
    expect(aliceAfter.disqualificationReason).toBe('hardship');
    expect(aliceAfter.seatHistory.at(-1)).toMatchObject({
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

describe('swapSeats', () => {
  it('swaps two occupied seats', () => {
    const p = panel([juror(1, 'Alice'), juror(2, 'Bob'), juror(3, 'Carla')]);
    const { panel: next } = swapSeats(p, 1, 3);
    expect(next.jurors.find((j) => j.identity.name === 'Alice')!.seatIndex).toBe(3);
    expect(next.jurors.find((j) => j.identity.name === 'Carla')!.seatIndex).toBe(1);
    expect(next.jurors.find((j) => j.identity.name === 'Bob')!.seatIndex).toBe(2);
  });

  it('moves into an empty seat', () => {
    const p = panel([juror(1, 'Alice'), juror(3, 'Carla')]);
    const { panel: next } = swapSeats(p, 1, 5);
    expect(next.jurors.find((j) => j.identity.name === 'Alice')!.seatIndex).toBe(5);
    expect(next.jurors.find((j) => j.identity.name === 'Carla')!.seatIndex).toBe(3);
    // Seat 1 now has nobody
    expect(next.jurors.find((j) => j.seatIndex === 1)).toBeUndefined();
  });

  it('is a no-op when source seat is empty', () => {
    const p = panel([juror(2, 'Bob')]);
    const { panel: next } = swapSeats(p, 1, 5);
    expect(next).toBe(p);
  });

  it('is a no-op when source === target', () => {
    const p = panel([juror(1, 'Alice')]);
    const { panel: next } = swapSeats(p, 1, 1);
    expect(next).toBe(p);
  });

  it('records seatHistory entries on both jurors after a swap', () => {
    const p = panel([juror(1, 'Alice'), juror(2, 'Bob')]);
    const { panel: next } = swapSeats(p, 1, 2);
    const alice = next.jurors.find((j) => j.identity.name === 'Alice')!;
    const bob = next.jurors.find((j) => j.identity.name === 'Bob')!;
    expect(alice.seatHistory.at(-1)).toMatchObject({ fromSeat: 1, toSeat: 2 });
    expect(bob.seatHistory.at(-1)).toMatchObject({ fromSeat: 2, toSeat: 1 });
  });
});

function makeCase(overrides: {
  venireSize?: number;
  targetJurors?: number;
  targetAlternates?: number;
  defenseBudget?: number;
  stateBudget?: number;
  jurorStatuses?: JurorStatus[];
}): Case {
  const {
    venireSize = 21,
    targetJurors = 12,
    targetAlternates = 0,
    defenseBudget = 12,
    stateBudget = 12,
    jurorStatuses = [],
  } = overrides;

  const jurors: Juror[] = jurorStatuses.map((status, i) => ({
    ...makeEmptyJuror('panel-1', i + 1),
    status,
  }));

  return {
    id: 'case-1',
    schemaVersion: 3,
    meta: {
      name: 'Test',
      targetJurors,
      targetAlternates,
      peremptoryBudget: { defense: defenseBudget, state: stateBudget },
      venireSize,
      seatLayout: 'rows',
      customFactors: [],
      aisleAfterColumns: [],
    },
    mode: 'decision',
    currentPanelIndex: 0,
    panels: [
      {
        id: 'panel-1',
        index: 1,
        status: 'questioning',
        jurors,
        createdAt: new Date().toISOString(),
      },
    ],
    seatedJurorOrder: [],
    questionBank: [],
    analogyBank: [],
    venireList: [],
    archived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('calcCutoffSeat', () => {
  it('returns target + alternates + all remaining perems when no strikes used', () => {
    const c = makeCase({
      venireSize: 40,
      targetJurors: 12,
      targetAlternates: 2,
      defenseBudget: 6,
      stateBudget: 6,
    });
    // 12 + 2 + 6 + 6 = 26
    expect(calcCutoffSeat(c)).toBe(26);
  });

  it('decreases as peremptory strikes are used', () => {
    const c = makeCase({
      venireSize: 40,
      targetJurors: 12,
      targetAlternates: 0,
      defenseBudget: 6,
      stateBudget: 6,
      jurorStatuses: [
        'struck-peremptory-defense',
        'struck-peremptory-state',
        'active',
        'active',
      ],
    });
    // 12 + 0 + (6-1) + (6-1) = 22
    expect(calcCutoffSeat(c)).toBe(22);
  });

  it('increases when cause strikes or excusals are used (they consume extra seats)', () => {
    const c = makeCase({
      venireSize: 40,
      targetJurors: 12,
      targetAlternates: 0,
      defenseBudget: 6,
      stateBudget: 6,
      jurorStatuses: [
        'struck-cause-defense',
        'excused-by-court',
        'active',
      ],
    });
    // 12 + 0 + 6 + 6 + 2 (cause + excused) = 26
    expect(calcCutoffSeat(c)).toBe(26);
  });

  it('caps at venireSize', () => {
    const c = makeCase({
      venireSize: 21,
      targetJurors: 12,
      targetAlternates: 2,
      defenseBudget: 12,
      stateBudget: 12,
    });
    // 12 + 2 + 12 + 12 = 38, capped at 21
    expect(calcCutoffSeat(c)).toBe(21);
  });

  it('handles zero remaining strikes', () => {
    const c = makeCase({
      venireSize: 30,
      targetJurors: 12,
      targetAlternates: 0,
      defenseBudget: 2,
      stateBudget: 2,
      jurorStatuses: [
        'struck-peremptory-defense',
        'struck-peremptory-defense',
        'struck-peremptory-state',
        'struck-peremptory-state',
      ],
    });
    // 12 + 0 + 0 + 0 = 12
    expect(calcCutoffSeat(c)).toBe(12);
  });

  it('counts disqualified jurors as consuming seats', () => {
    const c = makeCase({
      venireSize: 30,
      targetJurors: 12,
      targetAlternates: 0,
      defenseBudget: 6,
      stateBudget: 6,
      jurorStatuses: ['disqualified', 'active'],
    });
    // 12 + 0 + 6 + 6 + 1 = 25
    expect(calcCutoffSeat(c)).toBe(25);
  });
});
