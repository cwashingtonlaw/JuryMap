import { describe, it, expect } from 'vitest';
import { generateBatsonMotionHtml } from './batson-motion';
import type { Case, Juror } from '../types/case';
import { makeEmptyJuror } from './panel';
import { CURRENT_SCHEMA_VERSION } from '../types/schema';

function juror(overrides: Partial<Juror>): Juror {
  return { ...makeEmptyJuror('p'), ...overrides };
}

function c(): Case {
  const now = new Date().toISOString();
  return {
    id: 'c',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    meta: {
      name: 'State v. Test',
      docketNumber: '12-345',
      location: 'Calcasieu',
      judge: 'Hon. Jones',
      targetJurors: 12,
      targetAlternates: 2,
      peremptoryBudget: { defense: 12, state: 12 },
      venireSize: 21,
      seatLayout: 'rows' as const,
      customFactors: [],
      aisleAfterColumns: [],
    },
    mode: 'decision',
    currentPanelIndex: 0,
    panels: [
      {
        id: 'p',
        index: 1,
        status: 'questioning',
        jurors: [
          juror({
            id: 'a',
            identity: { name: 'Alice' },
            status: 'struck-peremptory-state',
            strikeReason: 'prior jury deadlock',
            demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
          }),
          juror({
            id: 'b',
            identity: { name: 'Bob' },
            status: 'struck-peremptory-state',
            strikeReason: 'crime victim',
            demographics: { race: 'black', gender: 'male', maritalStatus: 'unknown' },
          }),
          juror({
            id: 'c',
            identity: { name: 'Carla' },
            status: 'struck-peremptory-state',
            strikeReason: 'LE family',
            demographics: { race: 'black', gender: 'female', maritalStatus: 'unknown' },
          }),
          juror({
            id: 'd',
            identity: { name: 'Dan' },
            status: 'kept',
            demographics: { race: 'white', gender: 'male', maritalStatus: 'unknown' },
          }),
        ],
        createdAt: now,
      },
    ],
    seatedJurorOrder: [],
    questionBank: [],
    analogyBank: [],
    venireList: [],
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

describe('generateBatsonMotionHtml', () => {
  it('includes the case caption, docket #, judge', () => {
    const html = generateBatsonMotionHtml(c(), { movant: 'defense' });
    expect(html).toContain('State v. Test');
    expect(html).toContain('12-345');
    expect(html).toContain('Hon. Jones');
  });

  it('lists each peremptory strike with reason', () => {
    const html = generateBatsonMotionHtml(c(), { movant: 'defense' });
    expect(html).toContain('Alice');
    expect(html).toContain('prior jury deadlock');
    expect(html).toContain('Bob');
    expect(html).toContain('Carla');
  });

  it('includes the tally summary', () => {
    const html = generateBatsonMotionHtml(c(), { movant: 'defense' });
    expect(html).toMatch(/State peremptories[:\s]*3/i);
  });
});
