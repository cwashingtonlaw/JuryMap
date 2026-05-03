import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer';
import type { Case, Juror } from '../types/case';
import { batsonTally } from '../lib/batson';
import {
  RACE_LABELS,
  GENDER_LABELS,
  MARITAL_LABELS,
} from '../types/demographics';

export interface ExportOptions {
  includeSeatingGrid: boolean;
  includeStrikeSummary: boolean;
  includeJurorDetails: boolean;
  includeHandwrittenNotes: boolean;
  includeDismissedJurors: boolean;
}


const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: 'Helvetica' },
  h1: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  h2: { fontSize: 13, fontWeight: 700, marginTop: 14, marginBottom: 6 },
  h3: { fontSize: 11, fontWeight: 700, marginTop: 10, marginBottom: 4 },
  meta: { marginBottom: 10, color: '#475569' },
  kv: { flexDirection: 'row', marginBottom: 2 },
  k: { width: 90, color: '#64748b' },
  v: { flex: 1 },
  jurorBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 6,
    marginBottom: 6,
    borderRadius: 2,
  },
  grid3: { flexDirection: 'row', justifyContent: 'space-between' },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    marginVertical: 6,
  },
  seatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 4,
  },
  seatCell: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 2,
    padding: 2,
    height: 44,
  },
  seatNum: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 2,
  },
  seatName: {
    fontSize: 9,
    fontWeight: 700,
  },
  seatStatusBadge: {
    marginTop: 2,
    fontSize: 7,
    fontWeight: 700,
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 1,
    alignSelf: 'flex-start',
  },
});

function defaultColumnsFor(size: number): number {
  if (size <= 6) return 6;
  if (size <= 12) return 6;
  if (size === 21) return 7;
  if (size <= 24) return 6;
  if (size <= 60) return 10;
  return 10;
}

function getStatusBadgeStyle(status: string) {
  if (status === 'kept') return { backgroundColor: '#d1fae5', color: '#065f46' };
  if (status.startsWith('struck-peremptory')) return { backgroundColor: '#fee2e2', color: '#991b1b' };
  if (status.startsWith('struck-cause')) return { backgroundColor: '#fef3c7', color: '#92400e' };
  if (status === 'excused-by-court' || status === 'disqualified') return { backgroundColor: '#e2e8f0', color: '#334155' };
  return null;
}

function getStatusBadgeLabel(status: string) {
  if (status === 'kept') return 'KEEP';
  if (status === 'struck-peremptory-defense') return 'PEREMPT - D';
  if (status === 'struck-peremptory-state') return 'PEREMPT - S';
  if (status === 'struck-cause-defense') return 'CAUSE - D';
  if (status === 'struck-cause-state') return 'CAUSE - S';
  if (status === 'excused-by-court') return 'EXCUSED';
  if (status === 'disqualified') return 'DISQ';
  return null;
}


function jurorDisposition(j: Juror): string {
  switch (j.status) {
    case 'active':
      return 'Active (undecided)';
    case 'kept':
      return 'Kept';
    case 'struck-peremptory-defense':
      return 'Peremptory — Defense';
    case 'struck-peremptory-state':
      return 'Peremptory — State';
    case 'struck-cause-defense':
      return 'Cause — Defense';
    case 'struck-cause-state':
      return 'Cause — State';
    case 'excused-by-court':
      return 'Excused by court';
    case 'disqualified':
      return 'Disqualified mid-questioning';
  }
}

export default function JuryReportDocument({ activeCase, options }: { activeCase: Case; options: ExportOptions }) {
  const tally = batsonTally(activeCase);
  const target = activeCase.meta.targetJurors;
  const kept: Juror[] = activeCase.panels
    .flatMap((p) => p.jurors.filter((j) => j.status === 'kept'));
  const orderedKept: Juror[] =
    activeCase.seatedJurorOrder.length === kept.length
      ? (activeCase.seatedJurorOrder
          .map((id) => kept.find((j) => j.id === id))
          .filter((x): x is Juror => !!x))
      : kept;

  // Active panel jurors for the seating grid
  const currentPanel = activeCase.panels[activeCase.currentPanelIndex];
  const bySeat = new Map<number, Juror>();
  if (currentPanel) {
    for (const j of currentPanel.jurors) {
      if (j.seatIndex != null) bySeat.set(j.seatIndex, j);
    }
  }

  const cols = defaultColumnsFor(activeCase.meta.venireSize);
  const rows = Math.ceil(activeCase.meta.venireSize / cols);
  const seatOrder: number[] = [];
  for (let r = 0; r < rows; r++) {
    const rowStart = r * cols + 1;
    const rowEnd = Math.min(rowStart + cols - 1, activeCase.meta.venireSize);
    const rowSeats: number[] = [];
    for (let s = rowStart; s <= rowEnd; s++) rowSeats.push(s);
    if (activeCase.meta.seatLayout === 'snake' && r % 2 === 1) rowSeats.reverse();
    seatOrder.push(...rowSeats);
  }
  while (seatOrder.length < rows * cols) seatOrder.push(0);

  const availableWidth = 612 - 36 * 2; // LETTER width - padding
  const cellWidth = (availableWidth - (cols - 1) * 4) / cols;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h1}>{activeCase.meta.name}</Text>
        <View style={styles.meta}>
          {activeCase.meta.docketNumber && (
            <View style={styles.kv}>
              <Text style={styles.k}>Docket #</Text>
              <Text style={styles.v}>{activeCase.meta.docketNumber}</Text>
            </View>
          )}
          {activeCase.meta.location && (
            <View style={styles.kv}>
              <Text style={styles.k}>Location</Text>
              <Text style={styles.v}>{activeCase.meta.location}</Text>
            </View>
          )}
          {activeCase.meta.judge && (
            <View style={styles.kv}>
              <Text style={styles.k}>Judge</Text>
              <Text style={styles.v}>{activeCase.meta.judge}</Text>
            </View>
          )}
          {activeCase.meta.trialDate && (
            <View style={styles.kv}>
              <Text style={styles.k}>Trial date</Text>
              <Text style={styles.v}>{activeCase.meta.trialDate}</Text>
            </View>
          )}
        </View>

        <Text style={styles.h2}>Seated Jury</Text>
        {orderedKept.map((j, i) => {
          const label =
            i < target ? `Juror ${i + 1}` : `Alternate ${i - target + 1}`;
          return (
            <View key={j.id} style={styles.kv}>
              <Text style={styles.k}>{label}</Text>
              <Text style={styles.v}>
                {j.identity.name}
                {j.employment.jobTitle ? ` — ${j.employment.jobTitle}` : ''}
              </Text>
            </View>
          );
        })}




        {options.includeStrikeSummary && (
          <>
            <Text style={styles.h2}>Peremptory Strikes — Batson Summary</Text>
            <Text>
              Defense peremptories: {tally.totals.defense} · State peremptories:{' '}
              {tally.totals.state}
            </Text>
            <Text style={styles.h3}>By race</Text>
            {(['defense', 'state'] as const).map((side) => {
              const nonZero = Object.entries(tally.byRace[side]).filter(
                ([, n]) => n > 0
              );
              if (nonZero.length === 0) return null;
              return (
                <Text key={side}>
                  {side === 'defense' ? 'Defense' : 'State'}:{' '}
                  {nonZero
                    .map(
                      ([r, n]) =>
                        `${n} ${RACE_LABELS[r as keyof typeof RACE_LABELS]}`
                    )
                    .join(' · ')}
                </Text>
              );
            })}
          </>
        )}
      </Page>

      {options.includeSeatingGrid && (
        <Page size="LETTER" style={styles.page}>
          <Text style={styles.h2}>Seating Grid</Text>
          <View style={styles.seatGrid}>
            {seatOrder.map((seat, i) => {
              if (seat === 0) {
                return <View key={`blank-${i}`} style={{ width: cellWidth, height: 44 }} />;
              }
              const juror = bySeat.get(seat);
              const badgeStyle = juror ? getStatusBadgeStyle(juror.status) : null;
              const badgeLabel = juror ? getStatusBadgeLabel(juror.status) : null;
              
              return (
                <View key={seat} style={[styles.seatCell, { width: cellWidth }]}>
                  <Text style={styles.seatNum}>Seat {seat}</Text>
                  <Text style={[styles.seatName, { color: juror && juror.status !== 'active' && juror.status !== 'kept' ? '#94a3b8' : '#0f172a' }]}>
                    {juror?.identity.name || ''}
                  </Text>
                  {badgeLabel && badgeStyle && (
                    <Text style={[styles.seatStatusBadge, badgeStyle]}>
                      {badgeLabel}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        </Page>
      )}


      {options.includeJurorDetails && activeCase.panels.map((panel) => {
        const jurorsToRender = options.includeDismissedJurors
          ? panel.jurors
          : panel.jurors.filter((j) => j.status === 'active' || j.status === 'kept');

        if (jurorsToRender.length === 0) return null;

        return (
          <Page key={panel.id} size="LETTER" style={styles.page}>
            <Text style={styles.h2}>
              Panel {panel.index} ({panel.status})
            </Text>
            {jurorsToRender.map((j) => (
              <View key={j.id} style={styles.jurorBox}>
                <View style={styles.grid3}>
                  <Text style={{ fontWeight: 700 }}>
                    Seat {j.seatIndex ?? '—'} · {j.identity.name || '(unnamed)'}
                  </Text>
                  <Text>{jurorDisposition(j)}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.kv}>
                  <Text style={styles.k}>Juror #</Text>
                  <Text style={styles.v}>{j.identity.jurorNumber ?? '—'}</Text>
                </View>
                <View style={styles.kv}>
                  <Text style={styles.k}>Demographics</Text>
                  <Text style={styles.v}>
                    {RACE_LABELS[j.demographics.race]} ·{' '}
                    {GENDER_LABELS[j.demographics.gender]} ·{' '}
                    {MARITAL_LABELS[j.demographics.maritalStatus]}
                  </Text>
                </View>
                {j.employment.employer && (
                  <View style={styles.kv}>
                    <Text style={styles.k}>Employer</Text>
                    <Text style={styles.v}>
                      {j.employment.employer}
                      {j.employment.jobTitle ? ` (${j.employment.jobTitle})` : ''}
                    </Text>
                  </View>
                )}
                {j.strikeReason && (
                  <View style={styles.kv}>
                    <Text style={styles.k}>Strike reason</Text>
                    <Text style={styles.v}>{j.strikeReason}</Text>
                  </View>
                )}
                {j.disqualificationReason && (
                  <View style={styles.kv}>
                    <Text style={styles.k}>Disq. reason</Text>
                    <Text style={styles.v}>{j.disqualificationReason}</Text>
                  </View>
                )}
                {options.includeHandwrittenNotes && j.notes && (
                  <View style={styles.kv}>
                    <Text style={styles.k}>Notes</Text>
                    <Text style={styles.v}>{j.notes}</Text>
                  </View>
                )}
              </View>
            ))}
          </Page>
        );
      })}
    </Document>
  );
}
