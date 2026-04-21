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
