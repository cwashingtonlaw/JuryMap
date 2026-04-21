import type { Case, Juror } from '../types/case';

export type Side = 'defense' | 'state';

export interface StrikeLogEntry {
  jurorId: string;
  name: string;
  panelIndex: number;
  seatIndex: number | null;
  side: Side;
  race: Juror['demographics']['race'];
  gender: Juror['demographics']['gender'];
  reason: string;
  at: string; // ISO timestamp from juror.updatedAt
}

export function batsonStrikeLog(c: Case): StrikeLogEntry[] {
  const out: StrikeLogEntry[] = [];
  for (const panel of c.panels) {
    for (const j of panel.jurors) {
      let side: Side | null = null;
      if (j.status === 'struck-peremptory-defense') side = 'defense';
      else if (j.status === 'struck-peremptory-state') side = 'state';
      if (!side) continue;
      out.push({
        jurorId: j.id,
        name: j.identity.name || '(unnamed)',
        panelIndex: panel.index,
        seatIndex: j.seatIndex,
        side,
        race: j.demographics.race,
        gender: j.demographics.gender,
        reason: j.strikeReason ?? '',
        at: j.updatedAt,
      });
    }
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

export interface Comparator {
  juror: Juror;
  sharedAttributes: string[];
  score: number;
}

function findJuror(c: Case, id: string): Juror | undefined {
  for (const p of c.panels) {
    const j = p.jurors.find((x) => x.id === id);
    if (j) return j;
  }
  return undefined;
}

const FLAG_KEYS = [
  'priorJury',
  'crimeVictim',
  'leFamily',
  'leFriend',
  'arrestHx',
  'convictionHx',
  'hardship',
] as const;

export function comparatorsFor(c: Case, struckJurorId: string): Comparator[] {
  const struck = findJuror(c, struckJurorId);
  if (!struck) return [];

  const allKept: Juror[] = c.panels.flatMap((p) =>
    p.jurors.filter((j) => j.status === 'kept')
  );

  const comps: Comparator[] = [];
  for (const kept of allKept) {
    // Only consider jurors of a different race
    if (kept.demographics.race === struck.demographics.race) continue;

    const shared: string[] = [];

    // Shared flags: both have the flag set to true
    for (const key of FLAG_KEYS) {
      if (struck.flags[key].value && kept.flags[key].value) {
        shared.push(key);
      }
    }

    // Shared employer / job title (case-insensitive, non-empty)
    const sEmp = (struck.employment.employer ?? '').trim().toLowerCase();
    const kEmp = (kept.employment.employer ?? '').trim().toLowerCase();
    if (sEmp && kEmp && sEmp === kEmp) shared.push('employer');

    const sJob = (struck.employment.jobTitle ?? '').trim().toLowerCase();
    const kJob = (kept.employment.jobTitle ?? '').trim().toLowerCase();
    if (sJob && kJob && sJob === kJob) shared.push('jobTitle');

    // Marital status match (excluding unknown)
    if (
      struck.demographics.maritalStatus !== 'unknown' &&
      struck.demographics.maritalStatus === kept.demographics.maritalStatus
    ) {
      shared.push('maritalStatus');
    }

    if (shared.length > 0) {
      comps.push({
        juror: kept,
        sharedAttributes: shared,
        score: shared.length,
      });
    }
  }
  return comps.sort((a, b) => b.score - a.score);
}

export interface PatternFlag {
  severity: 'warn' | 'alert';
  message: string;
}

const PROTECTED_RACES = ['black', 'hispanic', 'asian', 'native-american', 'pacific-islander'] as const;
const RACE_TITLE: Record<string, string> = {
  black: 'Black',
  white: 'White',
  hispanic: 'Hispanic',
  asian: 'Asian',
  'native-american': 'Native American',
  'pacific-islander': 'Pacific Islander',
  other: 'Other',
  unknown: 'Unknown',
};
const SIDE_TITLE: Record<Side, string> = {
  defense: 'Defense',
  state: 'State',
};

export function batsonPatternFlags(c: Case): PatternFlag[] {
  const flags: PatternFlag[] = [];
  const strikes = batsonStrikeLog(c);

  // Count per side × race
  const perSide: Record<Side, Record<string, number>> = {
    defense: {},
    state: {},
  };
  for (const s of strikes) {
    perSide[s.side][s.race] = (perSide[s.side][s.race] ?? 0) + 1;
  }

  (['defense', 'state'] as const).forEach((side) => {
    const total = Object.values(perSide[side]).reduce((a, b) => a + b, 0);
    if (total < 3) return;
    for (const [race, n] of Object.entries(perSide[side])) {
      const share = n / total;
      if (share >= 0.8) {
        flags.push({
          severity: 'warn',
          message: `${SIDE_TITLE[side]} has used ${n} of ${total} peremptories against ${RACE_TITLE[race] || race} jurors (${Math.round(share * 100)}%)`,
        });
      }
      // Prima facie: ≥ 3 against a protected group by a single side
      if (
        n >= 3 &&
        (PROTECTED_RACES as readonly string[]).includes(race)
      ) {
        flags.push({
          severity: 'alert',
          message: `${SIDE_TITLE[side]} peremptory count against ${RACE_TITLE[race]} jurors is ${n} — a Batson prima facie case is likely established.`,
        });
      }
    }
  });

  // De-duplicate identical messages
  const seen = new Set<string>();
  return flags.filter((f) => {
    if (seen.has(f.message)) return false;
    seen.add(f.message);
    return true;
  });
}
