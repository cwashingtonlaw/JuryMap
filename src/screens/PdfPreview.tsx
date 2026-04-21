import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { useCaseStore } from '../store/caseStore';
import JuryReportDocument from '../pdf/JuryReportDocument';

export default function PdfPreview() {
  const { caseId } = useParams();
  const activeCase = useCaseStore((s) => s.activeCase);
  const loadCase = useCaseStore((s) => s.loadCase);

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
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
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
          <PDFDownloadLink
            document={<JuryReportDocument activeCase={activeCase} />}
            fileName={filename}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            {({ loading }) => (loading ? 'Preparing…' : 'Download PDF')}
          </PDFDownloadLink>
        </div>
      </header>

      <div className="flex-1">
        <PDFViewer width="100%" height="100%" className="border-0">
          <JuryReportDocument activeCase={activeCase} />
        </PDFViewer>
      </div>
    </div>
  );
}
