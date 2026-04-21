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
});

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

export default function JuryReportDocument({ activeCase }: { activeCase: Case }) {
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
          {activeCase.meta.parish && (
            <View style={styles.kv}>
              <Text style={styles.k}>Parish</Text>
              <Text style={styles.v}>{activeCase.meta.parish}</Text>
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
      </Page>

      {activeCase.panels.map((panel) => (
        <Page key={panel.id} size="LETTER" style={styles.page}>
          <Text style={styles.h2}>
            Panel {panel.index} ({panel.status})
          </Text>
          {panel.jurors.map((j) => (
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
              {j.notes && (
                <View style={styles.kv}>
                  <Text style={styles.k}>Notes</Text>
                  <Text style={styles.v}>{j.notes}</Text>
                </View>
              )}
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}
