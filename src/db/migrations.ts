import type { Case } from '../types/case';

type MigrationFn = (input: any) => any;

// Future migrations: add entries as { from: N, to: N+1, fn: ... }
const MIGRATIONS: Array<{ from: number; to: number; fn: MigrationFn }> = [];

export interface MigrationResult {
  migrated: Case;
  appliedMigrations: string[];
}

export function migrate(input: any, currentVersion: number): MigrationResult {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Invalid case payload: not an object');
  }
  const from = input.schemaVersion;
  if (typeof from !== 'number') {
    throw new Error('Invalid case payload: missing schemaVersion');
  }
  if (from > currentVersion) {
    throw new Error(
      `This file was saved by a newer version of the app (v${from}). Update before opening.`
    );
  }

  let data = input;
  const applied: string[] = [];
  for (const m of MIGRATIONS) {
    if (data.schemaVersion < m.to) {
      data = m.fn(data);
      data = { ...data, schemaVersion: m.to };
      applied.push(`v${m.from}→v${m.to}`);
    }
  }

  return { migrated: data as Case, appliedMigrations: applied };
}
