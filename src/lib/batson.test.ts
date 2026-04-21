import { describe, it, expect } from 'vitest';
import { batsonTally } from './batson';
import type { Case, Juror } from '../types/case';
import { makeEmptyJuror } from './panel';

function juror(overrides: Partial<Juror>): Juror {
  return { ...makeEmptyJuror('p'), ...overrides };
}

function caseWithJurors(jurors: Juror[]): Case {
  const now = new Date().toISOString();
  return {
    id: 'c',
    schemaVersion: 1,
    meta: {
      name: 'Test',
      targetJurors: 12,
      targetAlternates: 2,
      peremptoryBudget: { defense: 12, state: 12 },
      venireSize: 21,
      seatLayout: 'rows' as const,
    },
    mode: 'decision',
    currentPanelIndex: 0,
    panels: [
      { id: 'p', index: 1, status: 'questioning', jurors, createdAt: now },
    ],
    seatedJurorOrder: [],
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

describe('batsonTally', () => {
  it('aggregates peremptories by side × race', () => {
    const c = caseWithJurors([
      juror({
        status: 'struck-peremptory-defense',
        demographics: { race: 'black', gender: 'male', maritalStatus: 'unknown' },
      }),
      juror({
        status: 'struck-peremptory-state',
        demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
      }),
      juror({
        status: 'struck-peremptory-state',
        demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
      }),
      juror({
        status: 'struck-peremptory-state',
        demographics: { race: 'white', gender: 'male', maritalStatus: 'unknown' },
      }),
    ]);
    const t = batsonTally(c);
    expect(t.byRace.defense.black).toBe(1);
    expect(t.byRace.state.black).toBe(2);
    expect(t.byRace.state.white).toBe(1);
    expect(t.totals.defense).toBe(1);
    expect(t.totals.state).toBe(3);
  });

  it('aggregates peremptories by side × gender', () => {
    const c = caseWithJurors([
      juror({
        status: 'struck-peremptory-defense',
        demographics: { race: 'unknown', gender: 'female', maritalStatus: 'unknown' },
      }),
      juror({
        status: 'struck-peremptory-state',
        demographics: { race: 'unknown', gender: 'male', maritalStatus: 'unknown' },
      }),
    ]);
    const t = batsonTally(c);
    expect(t.byGender.defense.female).toBe(1);
    expect(t.byGender.state.male).toBe(1);
  });

  it('excludes cause strikes, excusals, kept, and active', () => {
    const c = caseWithJurors([
      juror({
        status: 'struck-cause-defense',
        demographics: { race: 'black', gender: 'male', maritalStatus: 'unknown' },
      }),
      juror({
        status: 'excused-by-court',
        demographics: { race: 'black', gender: 'male', maritalStatus: 'unknown' },
      }),
      juror({
        status: 'kept',
        demographics: { race: 'black', gender: 'male', maritalStatus: 'unknown' },
      }),
      juror({
        status: 'active',
        demographics: { race: 'black', gender: 'male', maritalStatus: 'unknown' },
      }),
    ]);
    const t = batsonTally(c);
    expect(t.totals.defense).toBe(0);
    expect(t.totals.state).toBe(0);
    expect(t.byRace.defense.black).toBe(0);
  });

  it('aggregates across all panels', () => {
    const base = caseWithJurors([
      juror({
        status: 'struck-peremptory-state',
        demographics: { race: 'black', gender: 'male', maritalStatus: 'unknown' },
      }),
    ]);
    // Add a second panel with another strike
    const now = new Date().toISOString();
    base.panels.push({
      id: 'p2',
      index: 2,
      status: 'questioning',
      jurors: [
        juror({
          status: 'struck-peremptory-state',
          demographics: { race: 'hispanic', gender: 'male', maritalStatus: 'unknown' },
        }),
      ],
      createdAt: now,
    });
    const t = batsonTally(base);
    expect(t.byRace.state.black).toBe(1);
    expect(t.byRace.state.hispanic).toBe(1);
    expect(t.totals.state).toBe(2);
  });
});
