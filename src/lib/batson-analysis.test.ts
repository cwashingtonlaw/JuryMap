import { describe, it, expect } from 'vitest';
import {
  batsonStrikeLog,
  comparatorsFor,
  batsonPatternFlags,
} from './batson-analysis';
import type { Case, Juror } from '../types/case';
import { makeEmptyJuror } from './panel';

function juror(overrides: Partial<Juror>): Juror {
  return { ...makeEmptyJuror('p'), ...overrides };
}

function buildCase(jurors: Juror[]): Case {
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
      {
        id: 'p',
        index: 1,
        status: 'questioning',
        jurors,
        createdAt: now,
      },
    ],
    seatedJurorOrder: [],
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

describe('batsonStrikeLog', () => {
  it('returns peremptory strikes sorted by updatedAt ascending', () => {
    const c = buildCase([
      juror({
        id: 'j1',
        identity: { name: 'Alice' },
        status: 'struck-peremptory-state',
        strikeReason: 'a',
        updatedAt: '2026-04-20T12:00:00.000Z',
        demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
      }),
      juror({
        id: 'j2',
        identity: { name: 'Bob' },
        status: 'struck-peremptory-defense',
        strikeReason: 'b',
        updatedAt: '2026-04-20T12:05:00.000Z',
        demographics: { race: 'white', gender: 'male', maritalStatus: 'unknown' },
      }),
      juror({
        id: 'j3',
        identity: { name: 'Carla' },
        status: 'kept',
        updatedAt: '2026-04-20T12:10:00.000Z',
        demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
      }),
    ]);
    const log = batsonStrikeLog(c);
    expect(log.length).toBe(2);
    expect(log[0].jurorId).toBe('j1');
    expect(log[0].side).toBe('state');
    expect(log[1].side).toBe('defense');
  });

  it('excludes cause strikes and excusals', () => {
    const c = buildCase([
      juror({
        id: 'j1',
        status: 'struck-cause-defense',
        strikeReason: 'x',
        demographics: { race: 'black', gender: 'male', maritalStatus: 'unknown' },
      }),
    ]);
    expect(batsonStrikeLog(c)).toEqual([]);
  });
});

describe('comparatorsFor', () => {
  const common = (over: Partial<Juror>): Juror =>
    juror({
      ...over,
      flags: {
        priorJury: { value: false },
        crimeVictim: { value: true, note: '' },
        leFamily: { value: false },
        leFriend: { value: false },
        arrestHx: { value: false },
        convictionHx: { value: false },
        hardship: { value: false },
      },
      employment: { jobTitle: 'Teacher' },
    });

  it('finds kept jurors of a different race with shared attributes', () => {
    const struck = common({
      id: 'js',
      status: 'struck-peremptory-state',
      strikeReason: 'crime victim history',
      demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
    });
    const kept = common({
      id: 'jk',
      status: 'kept',
      demographics: { race: 'white', gender: 'female', maritalStatus: 'unknown' },
    });
    const c = buildCase([struck, kept]);
    const comps = comparatorsFor(c, 'js');
    expect(comps.length).toBe(1);
    expect(comps[0].juror.id).toBe('jk');
    // Shared: crimeVictim flag + jobTitle
    expect(comps[0].sharedAttributes).toContain('crimeVictim');
    expect(comps[0].sharedAttributes).toContain('jobTitle');
    expect(comps[0].score).toBeGreaterThanOrEqual(2);
  });

  it('returns empty when no kept jurors share attributes', () => {
    const struck = juror({
      id: 'js',
      status: 'struck-peremptory-state',
      demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
      flags: {
        priorJury: { value: false },
        crimeVictim: { value: true },
        leFamily: { value: false },
        leFriend: { value: false },
        arrestHx: { value: false },
        convictionHx: { value: false },
        hardship: { value: false },
      },
    });
    const kept = juror({
      id: 'jk',
      status: 'kept',
      demographics: { race: 'white', gender: 'female', maritalStatus: 'unknown' },
      flags: {
        priorJury: { value: false },
        crimeVictim: { value: false },
        leFamily: { value: false },
        leFriend: { value: false },
        arrestHx: { value: false },
        convictionHx: { value: false },
        hardship: { value: false },
      },
    });
    const c = buildCase([struck, kept]);
    expect(comparatorsFor(c, 'js')).toEqual([]);
  });

  it('excludes same-race jurors from comparators', () => {
    const struck = common({
      id: 'js',
      status: 'struck-peremptory-state',
      demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
    });
    const kept = common({
      id: 'jk',
      status: 'kept',
      demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
    });
    const c = buildCase([struck, kept]);
    expect(comparatorsFor(c, 'js')).toEqual([]);
  });
});

describe('batsonPatternFlags', () => {
  function strikeJuror(side: 'defense' | 'state', race: 'black' | 'white' | 'hispanic'): Juror {
    return juror({
      status:
        side === 'defense'
          ? 'struck-peremptory-defense'
          : 'struck-peremptory-state',
      strikeReason: 'x',
      demographics: { race, gender: 'male', maritalStatus: 'unknown' },
    });
  }

  it('flags when one side has ≥ 80% of peremptories against a single race (min 3)', () => {
    const c = buildCase([
      strikeJuror('state', 'black'),
      strikeJuror('state', 'black'),
      strikeJuror('state', 'black'),
      strikeJuror('state', 'black'),
      strikeJuror('state', 'white'),
    ]);
    const flags = batsonPatternFlags(c);
    expect(flags.some((f) => /State.*Black/i.test(f.message))).toBe(true);
  });

  it('raises prima-facie flag when ≥ 3 strikes against a protected group by one side', () => {
    const c = buildCase([
      strikeJuror('state', 'black'),
      strikeJuror('state', 'black'),
      strikeJuror('state', 'black'),
    ]);
    const flags = batsonPatternFlags(c);
    expect(flags.some((f) => /prima facie/i.test(f.message))).toBe(true);
  });

  it('returns no flags when the pattern is balanced', () => {
    const c = buildCase([
      strikeJuror('state', 'black'),
      strikeJuror('state', 'white'),
    ]);
    expect(batsonPatternFlags(c)).toEqual([]);
  });

  it('fires a Fisher alert when strike pattern is statistically extreme', () => {
    // Venire: 10 black, 10 white. State strikes 5 black, 0 white.
    // Fisher's exact: [[5, 0], [5, 10]] → p ≈ 0.033 (significant, two-tailed)
    const jurors: Juror[] = [];
    for (let i = 0; i < 5; i++) {
      jurors.push(
        juror({
          status: 'struck-peremptory-state',
          seatIndex: i + 1,
          demographics: { race: 'black', gender: 'male', maritalStatus: 'unknown' },
        })
      );
    }
    for (let i = 0; i < 5; i++) {
      jurors.push(
        juror({
          status: 'active',
          seatIndex: i + 6,
          demographics: { race: 'black', gender: 'male', maritalStatus: 'unknown' },
        })
      );
    }
    for (let i = 0; i < 10; i++) {
      jurors.push(
        juror({
          status: 'active',
          seatIndex: i + 11,
          demographics: { race: 'white', gender: 'male', maritalStatus: 'unknown' },
        })
      );
    }
    const c = buildCase(jurors);
    const flags = batsonPatternFlags(c);
    expect(flags.some((f) => /Fisher/i.test(f.message))).toBe(true);
    expect(flags.some((f) => /0\.0[0-4]\d+/.test(f.message))).toBe(true);
  });
});
