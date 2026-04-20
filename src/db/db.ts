import Dexie, { type Table } from 'dexie';
import type { Case, CaseIndexRow } from '../types/case';

export interface CaseBlobRow {
  caseId: string;
  schemaVersion: number;
  data: Case;
  updatedAt: string;
}

export class JuryDB extends Dexie {
  cases!: Table<CaseIndexRow, string>;
  caseBlobs!: Table<CaseBlobRow, string>;

  constructor() {
    super('jury-selection');
    this.version(1).stores({
      cases: 'id, name, updatedAt, archived',
      caseBlobs: 'caseId',
    });
  }
}

export const db = new JuryDB();
