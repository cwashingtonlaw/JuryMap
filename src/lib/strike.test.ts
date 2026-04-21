import { describe, it, expect } from 'vitest';
import {
  isStruck,
  isEligibleForStrike,
  peremptoryCounts,
  countByStatus,
  PEREMPTORY_STATUSES,
  CAUSE_STATUSES,
} from './strike';
import type { Juror } from '../types/case';
import { makeEmptyJuror } from './panel';

function j(overrides: Partial<Juror> = {}): Juror {
  return { ...makeEmptyJuror('p'), ...overrides };
}

describe('isStruck', () => {
  it('is true for any non-active, non-kept status', () => {
    expect(isStruck(j({ status: 'struck-peremptory-defense' }))).toBe(true);
    expect(isStruck(j({ status: 'struck-cause-state' }))).toBe(true);
    expect(isStruck(j({ status: 'excused-by-court' }))).toBe(true);
    expect(isStruck(j({ status: 'disqualified' }))).toBe(true);
  });
  it('is false for active and kept', () => {
    expect(isStruck(j({ status: 'active' }))).toBe(false);
    expect(isStruck(j({ status: 'kept' }))).toBe(false);
  });
});

describe('isEligibleForStrike', () => {
  it('is true only for active, seated jurors', () => {
    expect(isEligibleForStrike(j({ status: 'active', seatIndex: 1 }))).toBe(true);
    expect(isEligibleForStrike(j({ status: 'active', seatIndex: null }))).toBe(
      false
    );
    expect(isEligibleForStrike(j({ status: 'kept', seatIndex: 1 }))).toBe(false);
    expect(
      isEligibleForStrike(j({ status: 'disqualified', seatIndex: null }))
    ).toBe(false);
  });
});

describe('peremptoryCounts', () => {
  it('counts defense and state peremptories across jurors', () => {
    const jurors = [
      j({ status: 'struck-peremptory-defense' }),
      j({ status: 'struck-peremptory-defense' }),
      j({ status: 'struck-peremptory-state' }),
      j({ status: 'struck-cause-state' }),
      j({ status: 'kept' }),
    ];
    expect(peremptoryCounts(jurors)).toEqual({ defense: 2, state: 1 });
  });
});

describe('countByStatus', () => {
  it('tallies each status', () => {
    const jurors = [
      j({ status: 'active' }),
      j({ status: 'active' }),
      j({ status: 'kept' }),
      j({ status: 'struck-peremptory-defense' }),
    ];
    const t = countByStatus(jurors);
    expect(t.active).toBe(2);
    expect(t.kept).toBe(1);
    expect(t['struck-peremptory-defense']).toBe(1);
  });
});

describe('constants', () => {
  it('PEREMPTORY_STATUSES lists both peremptory statuses', () => {
    expect(PEREMPTORY_STATUSES).toContain('struck-peremptory-defense');
    expect(PEREMPTORY_STATUSES).toContain('struck-peremptory-state');
    expect(PEREMPTORY_STATUSES).toHaveLength(2);
  });
  it('CAUSE_STATUSES lists both cause statuses', () => {
    expect(CAUSE_STATUSES).toContain('struck-cause-defense');
    expect(CAUSE_STATUSES).toContain('struck-cause-state');
    expect(CAUSE_STATUSES).toHaveLength(2);
  });
});
