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
