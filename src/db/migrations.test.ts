import { describe, it, expect } from 'vitest';
import { migrate } from './migrations';
import fixtureV1 from '../test/fixtures/case-v1.json';
import fixtureV2 from '../test/fixtures/case-v2.json';

describe('migrate', () => {
  it('returns v1 data unchanged', () => {
    const { migrated, appliedMigrations } = migrate(fixtureV1 as any, 1);
    expect(migrated).toEqual(fixtureV1);
    expect(appliedMigrations).toEqual([]);
  });

  it('throws when the file version is newer than supported', () => {
    const newer = { ...fixtureV1, schemaVersion: 99 };
    expect(() => migrate(newer as any, 1)).toThrow(
      /newer version of the app/i
    );
  });
});

describe('migrate v1→v2', () => {
  it('upgrades the v1 fixture to v2 with defaults', () => {
    const { migrated, appliedMigrations } = migrate(fixtureV1 as any, 2);
    expect(appliedMigrations).toEqual(['v1→v2']);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.meta.venireSize).toBe(21);
    expect(migrated.meta.seatLayout).toBe('rows');
  });

  it('leaves a v2 fixture unchanged', () => {
    const { migrated, appliedMigrations } = migrate(fixtureV2 as any, 2);
    expect(appliedMigrations).toEqual([]);
    expect(migrated).toEqual(fixtureV2);
  });

  it('backfills juror reactions and strikePriority', () => {
    const v1WithJurors = {
      ...fixtureV1,
      panels: [
        {
          id: 'p',
          index: 1,
          status: 'questioning',
          createdAt: '2026-04-20T00:00:00.000Z',
          jurors: [
            // Simulate a v1 juror (no reactions / strikePriority fields)
            {
              id: 'j1',
              panelId: 'p',
              seatIndex: 1,
              seatHistory: [],
              identity: { name: 'Legacy' },
              demographics: { race: 'unknown', gender: 'unknown', maritalStatus: 'unknown' },
              employment: {},
              flags: {
                priorJury: { value: false },
                crimeVictim: { value: false },
                leFamily: { value: false },
                leFriend: { value: false },
                arrestHx: { value: false },
                convictionHx: { value: false },
                hardship: { value: false },
              },
              views: {},
              notes: '',
              lean: 0,
              status: 'active',
              createdAt: '2026-04-20T00:00:00.000Z',
              updatedAt: '2026-04-20T00:00:00.000Z',
            },
          ],
        },
      ],
    };
    const { migrated } = migrate(v1WithJurors as any, 2);
    expect(migrated.panels[0].jurors[0].reactions).toEqual([]);
    expect(migrated.panels[0].jurors[0].strikePriority).toBe(0);
  });
});
