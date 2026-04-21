import type { Case } from '../types/case';
import { CURRENT_SCHEMA_VERSION } from '../types/schema';
import { migrate } from '../db/migrations';

export interface JuryFileEnvelope {
  schemaVersion: number;
  exportedAt: string;
  exportedBy: string;
  case: Case;
}

export function serializeCase(c: Case, exportedBy: string): string {
  const envelope: JuryFileEnvelope = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    exportedBy,
    case: c,
  };
  return JSON.stringify(envelope, null, 2);
}

export function deserializeCase(payload: string): Case {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new Error('Invalid .jury file: not valid JSON.');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid .jury file: not an object.');
  }
  const envelope = parsed as Partial<JuryFileEnvelope>;
  if (typeof envelope.schemaVersion !== 'number' || !envelope.case) {
    throw new Error('Invalid .jury file: missing schemaVersion or case.');
  }
  // Run through the migration gate — throws if newer than supported
  const { migrated } = migrate(
    { ...envelope.case, schemaVersion: envelope.schemaVersion },
    CURRENT_SCHEMA_VERSION
  );
  return migrated;
}
