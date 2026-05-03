import type { Race, Gender, MaritalStatus } from './demographics';
import { newId } from '../lib/id';

export type CaseMode = 'questioning' | 'decision' | 'seated';
export type PanelStatus = 'questioning' | 'decided' | 'archived';

export type JurorStatus =
  | 'active'
  | 'disqualified'
  | 'kept'
  | 'struck-peremptory-defense'
  | 'struck-peremptory-state'
  | 'struck-cause-defense'
  | 'struck-cause-state'
  | 'excused-by-court';

export type Lean = -3 | -2 | -1 | 0 | 1 | 2 | 3;

export type PartyRating = 'red' | 'green' | 'yellow' | 'orange' | 'unrated';

export type StrikePriority = 0 | 1 | 2 | 3 | 4 | 5;

export type ReactionKind = 'behavior' | 'analogy-response';
export type AnalogyResponse = 'yes' | 'no' | 'hesitant';

export interface ReactionEntry {
  at: string; // ISO timestamp
  kind: ReactionKind;
  note: string; // required for 'behavior', optional descriptive for 'analogy-response'
  analogyId?: string; // present when kind === 'analogy-response'
  checkpointId?: string; // present when kind === 'analogy-response'
  response?: AnalogyResponse; // present when kind === 'analogy-response'
}

export interface FlagEntry {
  value: boolean;
  note?: string;
}

/** A single attorney-defined rating dimension, up to 3 per case. */
export interface CustomFactor {
  id: string;    // stable nanoid, generated at creation
  label: string; // e.g. "Leadership"
  abbr: string;  // 2–6 chars shown on seat card, e.g. "LDR"
}

/** 0 = unrated/unset; 1–5 = rated score */
export type FactorScore = 0 | 1 | 2 | 3 | 4 | 5;

export function makeCustomFactor(label: string, abbr: string): CustomFactor {
  return { id: newId(), label, abbr };
}

export interface JurorFlags {
  priorJury: FlagEntry;
  crimeVictim: FlagEntry;
  leFamily: FlagEntry;
  leFriend: FlagEntry;
  arrestHx: FlagEntry;
  convictionHx: FlagEntry;
  hardship: FlagEntry;
}

export interface QuestionnaireEntry {
  question: string;
  answer: string;
}

export interface SeatMove {
  at: string; // ISO timestamp
  fromSeat: number | null;
  toSeat: number | null;
  reason: string;
  kind: 'replace-in-seat' | 'slide-left' | 'removed';
}

export interface Juror {
  id: string;
  panelId: string;

  seatIndex: number | null; // 1..21 or null if removed
  seatHistory: SeatMove[];

  identity: {
    name: string;
    jurorNumber?: string;
    age?: number;
    address?: string;
    zip?: string;
  };

  demographics: {
    race: Race;
    gender: Gender;
    maritalStatus: MaritalStatus;
    children?: number;
    education?: string;
  };

  employment: {
    employer?: string;
    jobTitle?: string;
    spouseEmployer?: string;
    spouseJobTitle?: string;
  };

  flags: JurorFlags;

  /** Scores keyed by CustomFactor.id. Absent key === unrated (0). */
  factorScores: Record<string, FactorScore>;

  views: {
    burdenOfProof?: string;
    punishment?: string;
    other?: string;
  };

  demeanor?: string;
  notes: string; // markdown-capable free-form
  notesMode?: 'text' | 'drawing'; // which notes tab is active; defaults to 'text'
  drawingData?: string; // serialized SVG path data for freehand ink strokes
  lean: Lean;
  partyRatings?: {
    plaintiff?: PartyRating;
    defense?: PartyRating;
  };
  reactions: ReactionEntry[];
  strikePriority: StrikePriority;

  questionnaire?: QuestionnaireEntry[];

  status: JurorStatus;
  disqualificationReason?: string;
  strikeReason?: string;

  createdAt: string;
  updatedAt: string;
}

export interface Panel {
  id: string;
  index: number; // 1-based panel number within the case
  status: PanelStatus;
  jurors: Juror[];
  createdAt: string;
  decidedAt?: string;
}

export interface PeremptoryBudget {
  defense: number;
  state: number;
}

export interface CaseMeta {
  name: string;
  docketNumber?: string;
  location?: string;
  judge?: string;
  trialDate?: string; // ISO date
  targetJurors: number;
  targetAlternates: number;
  peremptoryBudget: PeremptoryBudget;
  venireSize: number;
  customColumns?: number;
  seatLayout: 'rows' | 'snake';
  /** Attorney-defined rating dimensions, max 3. */
  customFactors: CustomFactor[];
  /** Insert visual aisle spacers after these 1-based column indices. */
  aisleAfterColumns: number[];
}

export interface Case {
  id: string;
  schemaVersion: number;
  meta: CaseMeta;
  mode: CaseMode;
  currentPanelIndex: number; // 0-based into panels[]
  panels: Panel[];
  seatedJurorOrder: string[]; // juror IDs
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CaseIndexRow {
  id: string;
  name: string;
  archived: boolean;
  updatedAt: string;
}

export const DEFAULT_PEREMPTORY_PRESETS: Record<string, PeremptoryBudget> = {
  capital: { defense: 12, state: 12 },
  'felony-12': { defense: 12, state: 12 },
  'felony-6': { defense: 6, state: 6 },
};

export function emptyFlags(): JurorFlags {
  const blank = (): FlagEntry => ({ value: false });
  return {
    priorJury: blank(),
    crimeVictim: blank(),
    leFamily: blank(),
    leFriend: blank(),
    arrestHx: blank(),
    convictionHx: blank(),
    hardship: blank(),
  };
}
