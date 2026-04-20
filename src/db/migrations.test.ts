import { describe, it, expect } from 'vitest';
import { migrate } from './migrations';
import fixtureV1 from '../test/fixtures/case-v1.json';

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
