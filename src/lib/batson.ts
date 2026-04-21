import type { Case } from '../types/case';
import type { Race, Gender } from '../types/demographics';

type Side = 'defense' | 'state';

type RaceCounts = Record<Race, number>;
type GenderCounts = Record<Gender, number>;

export interface BatsonTally {
  byRace: Record<Side, RaceCounts>;
  byGender: Record<Side, GenderCounts>;
  totals: Record<Side, number>;
}

function emptyRace(): RaceCounts {
  return {
    black: 0,
    white: 0,
    hispanic: 0,
    asian: 0,
    'native-american': 0,
    'pacific-islander': 0,
    other: 0,
    unknown: 0,
  };
}

function emptyGender(): GenderCounts {
  return { male: 0, female: 0, nonbinary: 0, unknown: 0 };
}

export function batsonTally(c: Case): BatsonTally {
  const t: BatsonTally = {
    byRace: { defense: emptyRace(), state: emptyRace() },
    byGender: { defense: emptyGender(), state: emptyGender() },
    totals: { defense: 0, state: 0 },
  };
  for (const panel of c.panels) {
    for (const j of panel.jurors) {
      let side: Side | null = null;
      if (j.status === 'struck-peremptory-defense') side = 'defense';
      else if (j.status === 'struck-peremptory-state') side = 'state';
      if (!side) continue;
      t.byRace[side][j.demographics.race]++;
      t.byGender[side][j.demographics.gender]++;
      t.totals[side]++;
    }
  }
  return t;
}
