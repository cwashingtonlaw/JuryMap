import { describe, it, expect } from 'vitest';
import { serializeCase, deserializeCase } from './juryfile';
import type { Case } from '../types/case';

function sampleCase(): Case {
  const now = new Date().toISOString();
  return {
    id: 'c',
    schemaVersion: 2,
    meta: {
      name: 'State v. X',
      targetJurors: 12,
      targetAlternates: 2,
      peremptoryBudget: { defense: 12, state: 12 },
      venireSize: 21,
      seatLayout: 'rows',
    },
    mode: 'questioning',
    currentPanelIndex: 0,
    panels: [
      {
        id: 'p',
        index: 1,
        status: 'questioning',
        jurors: [],
        createdAt: now,
      },
    ],
    seatedJurorOrder: [],
    archived: false,
    createdAt: now,
    updatedAt: now,
  };
}

describe('serializeCase / deserializeCase', () => {
  it('round-trips a case', () => {
    const c = sampleCase();
    const payload = serializeCase(c, 'app-test');
    const back = deserializeCase(payload);
    expect(back).toEqual(c);
  });

  it('serialized payload is valid JSON with schemaVersion, exportedAt, exportedBy', () => {
    const c = sampleCase();
    const payload = serializeCase(c, 'jury-selection-app/0.2.0');
    const obj = JSON.parse(payload);
    expect(obj.schemaVersion).toBe(2);
    expect(typeof obj.exportedAt).toBe('string');
    expect(obj.exportedBy).toBe('jury-selection-app/0.2.0');
    expect(obj.case.id).toBe('c');
  });

  it('rejects payload from a newer schema version', () => {
    const c = sampleCase();
    const payload = serializeCase(c, 'x');
    const obj = JSON.parse(payload);
    obj.schemaVersion = 99;
    expect(() => deserializeCase(JSON.stringify(obj))).toThrow(
      /newer version of the app/i
    );
  });

  it('rejects malformed JSON', () => {
    expect(() => deserializeCase('not json')).toThrow(/invalid/i);
  });
});
