import type { Case } from '../types/case';
import { batsonStrikeLog, comparatorsFor } from './batson-analysis';
import { batsonTally } from './batson';
import { RACE_LABELS, GENDER_LABELS } from '../types/demographics';

export interface MotionOptions {
  movant: 'defense' | 'state'; // which side is moving against the other's peremptories
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateBatsonMotionHtml(
  c: Case,
  opts: MotionOptions
): string {
  const opponent: 'defense' | 'state' =
    opts.movant === 'defense' ? 'state' : 'defense';
  const opponentLabel = opponent === 'defense' ? 'Defense' : 'State';
  const tally = batsonTally(c);
  const log = batsonStrikeLog(c).filter((e) => e.side === opponent);
  const total = tally.totals[opponent];

  const caption = escapeHtml(c.meta.name);
  const docket = escapeHtml(c.meta.docketNumber ?? '');
  const location = escapeHtml(c.meta.location ?? '');
  const judge = escapeHtml(c.meta.judge ?? '');

  const strikeRows = log
    .map((s) => {
      const comps = comparatorsFor(c, s.jurorId);
      const compText =
        comps.length > 0
          ? comps
              .slice(0, 3)
              .map(
                (comp) =>
                  `${escapeHtml(comp.juror.identity.name || '(unnamed)')} (${RACE_LABELS[comp.juror.demographics.race]}, kept; shared: ${comp.sharedAttributes.join(', ')})`
              )
              .join('; ')
          : 'none identified';
      return `
        <tr>
          <td>${escapeHtml(s.name)}</td>
          <td>${RACE_LABELS[s.race]}</td>
          <td>${GENDER_LABELS[s.gender]}</td>
          <td>${s.panelIndex}${s.seatIndex != null ? ` · seat ${s.seatIndex}` : ''}</td>
          <td>${escapeHtml(s.reason)}</td>
          <td>${compText}</td>
        </tr>
      `;
    })
    .join('');

  const byRaceSummary = Object.entries(tally.byRace[opponent])
    .filter(([, n]) => n > 0)
    .map(
      ([r, n]) => `${n} ${RACE_LABELS[r as keyof typeof RACE_LABELS]}`
    )
    .join(' · ');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Batson motion — ${caption}</title>
<style>
  body { font-family: "Times New Roman", Times, serif; max-width: 8.5in; margin: 1in auto; font-size: 12pt; }
  h1 { font-size: 14pt; text-align: center; text-transform: uppercase; }
  h2 { font-size: 12pt; margin-top: 1.5em; }
  .caption { text-align: center; margin-bottom: 2em; }
  table { border-collapse: collapse; width: 100%; font-size: 10pt; }
  th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #eee; }
  .note { font-style: italic; color: #333; }
</style>
</head>
<body>
  <div class="caption">
    <div><strong>${caption}</strong></div>
    <div>Docket # ${docket || '________'}</div>
    <div>${location ? `${location}, ` : ''}Judge ${judge || '________'}</div>
  </div>

  <h1>${opts.movant === 'defense' ? 'Defendant' : 'State'}'s Motion Challenging ${opponentLabel}'s Peremptory Strikes under <i>Batson v. Kentucky</i></h1>

  <p>
    ${opts.movant === 'defense' ? 'The defendant' : 'The State'}, through undersigned counsel, respectfully moves this Honorable Court to require the ${opponentLabel} to articulate race- and gender-neutral reasons for the peremptory challenges exercised against the following prospective jurors, and, finding those reasons pretextual, to prohibit the challenged strikes under <i>Batson v. Kentucky</i>, 476 U.S. 79 (1986), <i>J.E.B. v. Alabama ex rel. T.B.</i>, 511 U.S. 127 (1994), and their Louisiana progeny.
  </p>

  <h2>I. Prima facie showing</h2>
  <p>
    ${opponentLabel} peremptories: ${total}. ${opponentLabel} has used ${total} peremptory challenge${total === 1 ? '' : 's'} to this point in voir dire: <strong>${byRaceSummary || 'none recorded'}</strong>.
  </p>

  <h2>II. Strikes challenged</h2>
  <table>
    <thead>
      <tr>
        <th>Juror</th>
        <th>Race</th>
        <th>Gender</th>
        <th>Panel · seat</th>
        <th>Stated reason (if any)</th>
        <th>Comparators</th>
      </tr>
    </thead>
    <tbody>
      ${strikeRows || `<tr><td colspan="6" class="note">No peremptory strikes by ${opponentLabel} recorded.</td></tr>`}
    </tbody>
  </table>

  <h2>III. Comparator analysis</h2>
  <p>
    The comparators column identifies prospective jurors of a different race or gender who share one or more characteristics with each struck juror and whom ${opponentLabel} did <em>not</em> strike. <i>See Miller-El v. Dretke</i>, 545 U.S. 231 (2005); <i>J.E.B. v. Alabama ex rel. T.B.</i>, 511 U.S. 127 (1994). Disparate treatment of similarly-situated jurors is strong evidence of pretext.
  </p>

  <h2>IV. Relief requested</h2>
  <p>
    Counsel respectfully requests that the Court require ${opponentLabel} to state race- and gender-neutral reasons for the challenged strikes, and, if those reasons are pretextual or unsupported by the record, to deny the strikes.
  </p>

  <p style="margin-top:3em;">
    Respectfully submitted,<br/>
    __________________________<br/>
    Counsel for ${opts.movant === 'defense' ? 'Defendant' : 'the State'}
  </p>
</body>
</html>`;
}
