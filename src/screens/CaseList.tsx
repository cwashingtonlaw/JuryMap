import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCases } from '../db/repository';
import type { CaseIndexRow } from '../types/case';

export default function CaseList() {
  const [rows, setRows] = useState<CaseIndexRow[] | null>(null);

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
        <Link
          to="/cases/new"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          New Case
        </Link>
      </header>

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
