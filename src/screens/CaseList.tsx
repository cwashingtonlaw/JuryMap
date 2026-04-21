import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { listCases } from '../db/repository';
import { importCaseFromFile } from '../db/repository';
import type { CaseIndexRow } from '../types/case';
import { openJuryFile } from '../lib/files';
import { shouldShowInstallPrompt, isStandalonePwa } from '../lib/platform';

export default function CaseList() {
  const [rows, setRows] = useState<CaseIndexRow[] | null>(null);
  const nav = useNavigate();

  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (window.localStorage.getItem('jury:dismissedInstallBanner') === '1') return false;
    return shouldShowInstallPrompt();
  });

  function dismissInstallBanner() {
    window.localStorage.setItem('jury:dismissedInstallBanner', '1');
    setShowInstallBanner(false);
  }

  async function onOpenFile() {
    const text = await openJuryFile();
    if (!text) return;
    try {
      const id = await importCaseFromFile(text);
      nav(`/cases/${id}/questioning`);
    } catch (e) {
      alert('Could not open .jury file: ' + (e as Error).message);
    }
  }

  useEffect(() => {
    let cancelled = false;
    listCases({ includeArchived: false }).then((r) => {
      if (!cancelled) setRows(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (rows === null) return <div className="p-8 text-slate-500">Loading…</div>;

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white px-8 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cases</h1>
        <div className="flex gap-2 items-center">
          <Link
            to="/help"
            className="text-sm text-slate-600 hover:text-slate-900 mr-1"
          >
            Help
          </Link>
          <button
            type="button"
            onClick={onOpenFile}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            Open .jury File
          </button>
          <Link
            to="/cases/new"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            New Case
          </Link>
        </div>
      </header>

      {showInstallBanner && !isStandalonePwa() && (
        <div className="bg-amber-50 border-b border-amber-200 px-8 py-3 flex items-center justify-between">
          <div className="text-sm text-amber-900">
            <strong>Install this app</strong> for stable offline storage on your
            trial device.
          </div>
          <div className="flex gap-3 items-center">
            <Link
              to="/onboarding"
              className="text-sm font-medium text-amber-900 underline"
            >
              How to install
            </Link>
            <button
              onClick={dismissInstallBanner}
              className="text-sm text-amber-900/70 hover:text-amber-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="p-8">
        {rows.length === 0 ? (
          <div className="text-slate-500">
            No cases yet. Create one to get started.
          </div>
        ) : (
          <ul className="grid gap-3">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  to={`/cases/${r.id}/questioning`}
                  className="block rounded-md border border-slate-200 bg-white px-4 py-3 hover:border-slate-400"
                >
                  <div className="font-medium text-slate-900">{r.name}</div>
                  <div className="text-xs text-slate-500">
                    Last edited {new Date(r.updatedAt).toLocaleString()}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
