import { newId } from './id';
import { emptyFlags } from '../types/case';
import type { Juror, Panel, SeatMove } from '../types/case';

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
