import type { Case } from '../types/case';

type MigrationFn = (input: any) => any;

const MIGRATIONS: Array<{ from: number; to: number; fn: MigrationFn }> = [
  {
    from: 1,
    to: 2,
    fn: (data: any) => {
      // Backfill new CaseMeta fields
      const meta = data.meta ?? {};
      if (typeof meta.venireSize !== 'number') meta.venireSize = 21;
      if (meta.seatLayout !== 'snake') meta.seatLayout = 'rows';

      // Backfill new Juror fields on every juror in every panel
      const panels = Array.isArray(data.panels) ? data.panels : [];
      for (const p of panels) {
        const jurors = Array.isArray(p.jurors) ? p.jurors : [];
        for (const j of jurors) {
          if (!Array.isArray(j.reactions)) j.reactions = [];
          if (typeof j.strikePriority !== 'number') j.strikePriority = 0;
        }
      }
      return { ...data, meta, panels };
    },
  },
];

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
    if (data.schemaVersion < m.to && m.to <= currentVersion) {
      data = m.fn(data);
      data = { ...data, schemaVersion: m.to };
      applied.push(`v${m.from}→v${m.to}`);
    }
  }

  return { migrated: data as Case, appliedMigrations: applied };
}
