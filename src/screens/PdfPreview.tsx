import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { useCaseStore } from '../store/caseStore';
import JuryReportDocument, { type ExportOptions } from '../pdf/JuryReportDocument';

export default function PdfPreview() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);

  const [optionsModalOpen, setOptionsModalOpen] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    includeSeatingGrid: true,
    includeStrikeSummary: true,
    includeJurorDetails: true,
    includeHandwrittenNotes: true,
    includeDismissedJurors: true,
  });

  useEffect(() => {
    if (caseId) loadCase(caseId).catch(console.error);
  }, [caseId, loadCase]);

  if (!activeCase) return <div className="p-8 text-slate-500">Loading…</div>;

  const filename =
    (activeCase.meta.name || 'jury')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-voir-dire-report.pdf';

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{activeCase.meta.name}</h1>
          <div className="text-xs text-slate-500">PDF report preview</div>
        </div>
        <div className="flex gap-3">
          <Link
            to={`/cases/${caseId}/seated`}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ← Back to Seated Jury
          </Link>
          <button
            onClick={() => setOptionsModalOpen(true)}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export Options
          </button>
          <PDFDownloadLink
            document={<JuryReportDocument activeCase={activeCase} options={options} />}
            fileName={filename}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {({ loading }) => (loading ? 'Preparing…' : 'Download PDF')}
          </PDFDownloadLink>
        </div>
      </header>

      <div className="flex-1">
        <PDFViewer width="100%" height="100%" className="border-0">
          <JuryReportDocument activeCase={activeCase} options={options} />
        </PDFViewer>
      </div>

      {optionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOptionsModalOpen(false)}
          />
          <div className="relative bg-[var(--bg-surface)] rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Export Options</h2>
            
            <div className="space-y-4 mb-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={options.includeSeatingGrid}
                  onChange={(e) => setOptions({ ...options, includeSeatingGrid: e.target.checked })}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span className="text-sm font-medium text-slate-700">Include jury seating grid layout</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={options.includeStrikeSummary}
                  onChange={(e) => setOptions({ ...options, includeStrikeSummary: e.target.checked })}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span className="text-sm font-medium text-slate-700">Include peremptory strike summary</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={options.includeJurorDetails}
                  onChange={(e) => setOptions({ ...options, includeJurorDetails: e.target.checked })}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span className="text-sm font-medium text-slate-700">Include detailed juror information</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={options.includeHandwrittenNotes}
                  onChange={(e) => setOptions({ ...options, includeHandwrittenNotes: e.target.checked })}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span className="text-sm font-medium text-slate-700">Include handwritten notes</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={options.includeDismissedJurors}
                  onChange={(e) => setOptions({ ...options, includeDismissedJurors: e.target.checked })}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span className="text-sm font-medium text-slate-700">Include dismissed jurors</span>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setOptionsModalOpen(false)}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
