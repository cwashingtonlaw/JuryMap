import { newId } from './id';
import { emptyFlags } from '../types/case';
import type { Case, Juror, Panel, SeatMove } from '../types/case';
import { peremptoryCounts } from './strike';

export function makeEmptyJuror(panelId: string, seatIndex: number | null = null): Juror {
  const now = new Date().toISOString();
  return {
    id: newId(),
    panelId,
    seatIndex,
    seatHistory: [],
    identity: { name: '' },
    demographics: {
      race: 'unknown',
      gender: 'unknown',
      maritalStatus: 'unknown',
    },
    employment: {},
    flags: emptyFlags(),
    factorScores: {},
    views: {},
    notes: '',
    lean: 0,
    reactions: [],
    strikePriority: 0,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

function findById(p: Panel, id: string): Juror {
  const j = p.jurors.find((x) => x.id === id);
  if (!j) throw new Error(`Juror ${id} not found in panel ${p.id}`);
  return j;
}

function tsNow(): string {
  return new Date().toISOString();
}

export interface ReplaceResult {
  panel: Panel;
  newJuror: Juror;
}

export function replaceInSeat(
  panel: Panel,
  disqualifiedJurorId: string,
  reason: string
): ReplaceResult {
  const target = findById(panel, disqualifiedJurorId);
  if (target.seatIndex == null) {
    throw new Error('Juror has no seat; cannot replace-in-seat');
  }
  const seat = target.seatIndex;
  const now = tsNow();

  const move: SeatMove = {
    at: now,
    fromSeat: seat,
    toSeat: null,
    reason,
    kind: 'replace-in-seat',
  };

  const disqualified: Juror = {
    ...target,
    status: 'disqualified',
    seatIndex: null,
    seatHistory: [...target.seatHistory, move],
    disqualificationReason: reason,
    updatedAt: now,
  };

  const newJuror = makeEmptyJuror(panel.id, seat);

  const jurors = panel.jurors.map((j) => (j.id === target.id ? disqualified : j));
  jurors.push(newJuror);

  return {
    panel: { ...panel, jurors },
    newJuror,
  };
}

export function slideLeft(
  panel: Panel,
  disqualifiedJurorId: string,
  reason: string
): { panel: Panel } {
  const target = findById(panel, disqualifiedJurorId);
  if (target.seatIndex == null) {
    throw new Error('Juror has no seat; cannot slide-left');
  }
  const gap = target.seatIndex;
  const now = tsNow();

  const disqualified: Juror = {
    ...target,
    status: 'disqualified',
    seatIndex: null,
    disqualificationReason: reason,
    seatHistory: [
      ...target.seatHistory,
      { at: now, fromSeat: gap, toSeat: null, reason, kind: 'slide-left' },
    ],
    updatedAt: now,
  };

  const nextJurors: Juror[] = panel.jurors.map((j) => {
    if (j.id === target.id) return disqualified;
    if (j.seatIndex != null && j.seatIndex > gap) {
      const newSeat = j.seatIndex - 1;
      return {
        ...j,
        seatIndex: newSeat,
        seatHistory: [
          ...j.seatHistory,
          {
            at: now,
            fromSeat: j.seatIndex,
            toSeat: newSeat,
            reason: `slide-left after ${target.identity.name || 'juror'} disqualified`,
            kind: 'slide-left' as const,
          },
        ],
        updatedAt: now,
      };
    }
    return j;
  });

  return { panel: { ...panel, jurors: nextJurors } };
}

/**
 * Swap or move a juror from one seat to another.
 *
 * - If both seats are occupied: swap the two jurors' seatIndex (and write a
 *   seatHistory entry on each).
 * - If the target seat is empty: move the source juror into it, leaving the
 *   source seat empty.
 * - If the source seat is empty: noop (nothing to move).
 * - If source === target: noop.
 *
 * This is a visual rearrangement tool — strikes, disqualifications, and juror
 * identity are unaffected. It exists so the attorney can group cards by
 * priority or lean during the tactical planning phase.
 */
export function swapSeats(
  panel: Panel,
  fromSeat: number,
  toSeat: number
): { panel: Panel } {
  if (fromSeat === toSeat) return { panel };

  const now = tsNow();
  const source = panel.jurors.find((j) => j.seatIndex === fromSeat);
  const target = panel.jurors.find((j) => j.seatIndex === toSeat);

  if (!source) return { panel };

  const nextJurors: Juror[] = panel.jurors.map((j) => {
    if (j.id === source.id) {
      return {
        ...j,
        seatIndex: toSeat,
        seatHistory: [
          ...j.seatHistory,
          {
            at: now,
            fromSeat,
            toSeat,
            reason: target
              ? `swapped with seat ${toSeat}`
              : `moved to seat ${toSeat}`,
            kind: 'slide-left' as const,
          },
        ],
        updatedAt: now,
      };
    }
    if (target && j.id === target.id) {
      return {
        ...j,
        seatIndex: fromSeat,
        seatHistory: [
          ...j.seatHistory,
          {
            at: now,
            fromSeat: toSeat,
            toSeat: fromSeat,
            reason: `swapped with seat ${fromSeat}`,
            kind: 'slide-left' as const,
          },
        ],
        updatedAt: now,
      };
    }
    return j;
  });

  return { panel: { ...panel, jurors: nextJurors } };
}

/**
 * Calculate the last seat number that is mathematically "in play".
 *
 * The cutoff is the highest seat index that could potentially be called
 * to serve, given the remaining peremptory strikes from both sides plus
 * cause/excusal strikes already used (which created additional seats needed).
 *
 * Seats beyond this number are dimmed in the UI so the attorney instantly
 * knows the realistic boundary of the panel.
 */
export function calcCutoffSeat(c: Case): number {
  const { targetJurors, targetAlternates, peremptoryBudget, venireSize } = c.meta;
  const allJurors = c.panels.flatMap((p) => p.jurors);
  const counts = peremptoryCounts(allJurors);

  const defenseRemaining = Math.max(0, peremptoryBudget.defense - counts.defense);
  const stateRemaining = Math.max(0, peremptoryBudget.state - counts.state);

  // Count cause strikes and excusals already used (these consumed seats
  // beyond peremptory budget)
  let causeAndExcused = 0;
  for (const j of allJurors) {
    if (
      j.status === 'struck-cause-defense' ||
      j.status === 'struck-cause-state' ||
      j.status === 'excused-by-court' ||
      j.status === 'disqualified'
    ) {
      causeAndExcused++;
    }
  }

  const cutoff =
    targetJurors + targetAlternates + defenseRemaining + stateRemaining + causeAndExcused;

  return Math.min(cutoff, venireSize);
}
