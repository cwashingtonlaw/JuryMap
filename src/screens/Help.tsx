import { Link } from 'react-router-dom';

interface Shortcut {
  keys: string;
  action: string;
  context: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: '←  →', action: 'Cycle to previous/next seat', context: 'Questioning' },
  { keys: '↑  ↓', action: 'Cycle up/down one row (±7 seats)', context: 'Questioning' },
  { keys: '1 – 7', action: 'Set lean rating (1=strongly state → 7=strongly defense)', context: 'Juror drawer' },
  { keys: 'V', action: 'Toggle Crime Victim flag', context: 'Juror drawer' },
  { keys: 'L', action: 'Toggle LE Family flag', context: 'Juror drawer' },
  { keys: 'P', action: 'Toggle Prior Jury flag', context: 'Juror drawer' },
  { keys: 'Esc', action: 'Close juror drawer / modal', context: 'Any modal' },
  { keys: '⌘/Ctrl + S', action: 'Save current case as a .jury file', context: 'Questioning, Decision' },
];

export default function Help() {
  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Help</h1>
        <Link
          to="/cases"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to Cases
        </Link>
      </header>

      <div className="max-w-3xl p-8 grid gap-8">
        <section>
          <h2 className="text-lg font-semibold mb-2">Analogy library</h2>
          <p className="text-sm text-slate-600 mb-3">
            During voir dire, open any juror&apos;s drawer and tap{' '}
            <strong>&ldquo;Walk through an analogy…&rdquo;</strong>. Pick from
            seven built-in frameworks organized by topic:
          </p>
          <ul className="list-disc ml-5 text-sm text-slate-700 space-y-1">
            <li>
              <strong>Burden of proof:</strong> Pilot &amp; the Plane, Skydiving Red String,
              Tylenol with Cyanide.
            </li>
            <li>
              <strong>Circumstantial evidence:</strong> the Cookie Jar progression.
            </li>
            <li>
              <strong>Law-enforcement bias:</strong> a three-step depth-of-ties tree.
            </li>
            <li>
              <strong>Defendant&apos;s silence:</strong> the Unfair Contest reframe.
            </li>
            <li>
              <strong>Social pressure:</strong> anticipating post-verdict fallout.
            </li>
          </ul>
          <p className="text-sm text-slate-600 mt-3">
            Each framework walks you through attorney prompts and lets your
            spotter tap yes / no / hesitant for each checkpoint. Responses are
            saved on the juror&apos;s record and shown as a summary in the
            drawer. The case-level <strong>Analogy report</strong>{' '}
            (header link in Questioning) lays out the full matrix — who
            reacted how to what.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Strike priority ring</h2>
          <p className="text-sm text-slate-600">
            In Decision mode, tap any seat and use the{' '}
            <strong>Strike priority</strong> row at the top of the picker to
            rank a juror 1–5 for strike order. The ranking renders as an
            outer ring on the seat card — amber at 1, red at 5 — so you can
            see at a glance who to peremptory first if budget is tight. The
            ranking is independent of the keep/strike decision itself.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Apple Pencil / iPadOS Scribble</h2>
          <p className="text-sm text-slate-600">
            On an iPad with Apple Pencil, you can write in any text field and
            iPadOS will convert your handwriting into typed text automatically
            (Scribble). No app setting or setup is needed — just start writing.
            Useful for jotting reactions while keeping eye contact with the
            juror.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Venire size &amp; layout</h2>
          <p className="text-sm text-slate-600">
            When creating a case, pick the venire size (6, 12, 21, 60, 100)
            and seat layout — rows (left-to-right throughout) or snake
            (alternating direction). The snake layout mirrors how some
            jurisdictions seat and call names. 21 rows-7-wide is the
            Louisiana default.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Keyboard shortcuts</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-300 text-slate-500 uppercase tracking-wider text-xs">
                <th className="text-left py-1 pr-4 font-medium">Keys</th>
                <th className="text-left py-1 pr-4 font-medium">Action</th>
                <th className="text-left py-1 pr-4 font-medium">Where</th>
              </tr>
            </thead>
            <tbody>
              {SHORTCUTS.map((s) => (
                <tr key={s.keys} className="border-b border-slate-100">
                  <td className="py-1 pr-4 font-mono text-xs">{s.keys}</td>
                  <td className="py-1 pr-4">{s.action}</td>
                  <td className="py-1 pr-4 text-slate-500">{s.context}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Pre-trial dry-run checklist</h2>
          <p className="text-sm text-slate-600 mb-3">
            Run this the night before every trial so nothing surprises you in
            court.
          </p>
          <ol className="list-decimal ml-5 text-sm text-slate-700 space-y-2">
            <li>Open the app on your trial device. Confirm it is installed (standalone window, not a browser tab).</li>
            <li>Create a throwaway test case. Paste a fake 21-juror venire (CSV with headers: <code>name,juror_number</code>).</li>
            <li>Open each juror, edit every field, close drawer, reopen — verify persistence.</li>
            <li>Disqualify seat 3 (Replace in seat). Verify seat 3 opens up with an empty slot; seats 4–21 unchanged.</li>
            <li>Disqualify seat 4 (Slide left). Verify seats 4–20 shift, seat 21 becomes empty.</li>
            <li>Advance to Decision. Mark each juror with a decision. Include at least 4 peremptory strikes across sides.</li>
            <li>Verify the Peremptory Tracker rail counts update live.</li>
            <li>Verify the Batson tally header updates live.</li>
            <li>Open the dedicated Batson Analysis screen. Verify the strike log, cross-tab, and pattern flags render.</li>
            <li>Click "Export Motion Draft" — verify the HTML draft opens in a new tab.</li>
            <li>Keep enough jurors to reach the target. Finish Decisions → verify the Seated Jury screen.</li>
            <li>Drag-reorder the seated list. Export the PDF report. Confirm it downloads and opens.</li>
            <li>Cmd/Ctrl + S to save the case as a <code>.jury</code> file. On the Cases screen, "Open .jury File" the saved file — verify it reimports cleanly.</li>
            <li>Delete the test case (or archive it).</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">About</h2>
          <p className="text-sm text-slate-600">
            Jury Selection — a Louisiana criminal voir dire companion. Everything
            runs in your browser. No data is sent to any server. To move a case
            between devices, use <code>.jury</code> file save/open.
          </p>
        </section>
      </div>
    </div>
  );
}
