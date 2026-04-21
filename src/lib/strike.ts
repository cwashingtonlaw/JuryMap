import type { Juror, JurorStatus } from '../types/case';

export const PEREMPTORY_STATUSES = [
  'struck-peremptory-defense',
  'struck-peremptory-state',
] as const satisfies readonly JurorStatus[];

export const CAUSE_STATUSES = [
  'struck-cause-defense',
  'struck-cause-state',
] as const satisfies readonly JurorStatus[];

export const STRIKE_STATUSES = [
  ...PEREMPTORY_STATUSES,
  ...CAUSE_STATUSES,
  'excused-by-court',
  'disqualified',
] as const satisfies readonly JurorStatus[];

export function isStruck(j: Juror): boolean {
  return (STRIKE_STATUSES as readonly JurorStatus[]).includes(j.status);
}

export function isEligibleForStrike(j: Juror): boolean {
  return j.status === 'active' && j.seatIndex != null;
}

export interface PeremptoryCount {
  defense: number;
  state: number;
}

export function peremptoryCounts(jurors: Juror[]): PeremptoryCount {
  let defense = 0;
  let state = 0;
  for (const j of jurors) {
    if (j.status === 'struck-peremptory-defense') defense++;
    else if (j.status === 'struck-peremptory-state') state++;
  }
  return { defense, state };
}

export type StatusTally = Record<JurorStatus, number>;

export function countByStatus(jurors: Juror[]): StatusTally {
  const t: StatusTally = {
    active: 0,
    disqualified: 0,
    kept: 0,
    'struck-peremptory-defense': 0,
    'struck-peremptory-state': 0,
    'struck-cause-defense': 0,
    'struck-cause-state': 0,
    'excused-by-court': 0,
  };
  for (const j of jurors) t[j.status]++;
  return t;
}
