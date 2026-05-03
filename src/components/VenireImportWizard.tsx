import { useState, useMemo } from 'react';
import {
  parseCsvPreview,
  parseVenireWithMapping,
  suggestMapping,
  MAPPABLE_FIELD_LABELS,
  type MappableField,
  type VenireRow,
} from '../lib/venire-import';

interface Props {
  onImport: (rows: VenireRow[]) => void;
  onCancel: () => void;
}

type Step = 'paste' | 'map' | 'preview';

const ALL_FIELDS: MappableField[] = [
  'skip', 'name', 'jurorNumber', 'age', 'address', 'zip', 'race', 'gender',
];

export default function VenireImportWizard({ onImport, onCancel }: Props) {
  const [step, setStep] = useState<Step>('paste');
  const [rawText, setRawText] = useState('');
  const [columnMap, setColumnMap] = useState<MappableField[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Parse preview when advancing to map step
  const preview = useMemo(() => {
    if (!rawText.trim()) return null;
    return parseCsvPreview(rawText);
  }, [rawText]);

  function advanceToMap() {
    if (!rawText.trim()) {
      setError('Paste your venire list first.');
      return;
    }
    const p = parseCsvPreview(rawText);
    if (p.headers.length === 0) {
      setError('Could not detect CSV columns. Check the format.');
      return;
    }
    // Auto-suggest mappings
    setColumnMap(p.headers.map(suggestMapping));
    setError(null);
    setStep('map');
  }

  function advanceToPreview() {
    if (!columnMap.includes('name')) {
      setError('At least one column must be mapped to "Name".');
      return;
    }
    setError(null);
    setStep('preview');
  }

  const mappedResult = useMemo(() => {
    if (step !== 'preview') return null;
    return parseVenireWithMapping(rawText, columnMap);
  }, [step, rawText, columnMap]);

  function doImport() {
    if (!mappedResult || mappedResult.rows.length === 0) return;
    onImport(mappedResult.rows);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-[var(--bg-surface)] rounded-lg shadow-xl w-[700px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold">Import Venire List</h2>
          <div className="flex items-center gap-4">
            <div className="flex gap-1 text-xs">
              <span className={step === 'paste' ? 'font-bold text-slate-900' : 'text-slate-400'}>1. Paste</span>
              <span className="text-slate-300">&rarr;</span>
              <span className={step === 'map' ? 'font-bold text-slate-900' : 'text-slate-400'}>2. Map</span>
              <span className="text-slate-300">&rarr;</span>
              <span className={step === 'preview' ? 'font-bold text-slate-900' : 'text-slate-400'}>3. Preview</span>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-700 text-lg"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Paste */}
          {step === 'paste' && (
            <div className="grid gap-3">
              <p className="text-sm text-slate-600">
                Paste your venire list as CSV (with headers). The wizard will help you map columns.
              </p>
              <textarea
                rows={10}
                autoFocus
                className="rounded-md border border-slate-300 px-3 py-2 font-mono text-sm w-full"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Full Name,Juror No.,Age,Race,Gender\nAlice Jones,101,34,White,Female\nBob Smith,102,42,Black,Male`}
              />
            </div>
          )}

          {/* Step 2: Map columns */}
          {step === 'map' && preview && (
            <div className="grid gap-4">
              <p className="text-sm text-slate-600">
                Map each CSV column to a juror field. Auto-suggested mappings are pre-filled.
              </p>
              <div className="overflow-x-auto">
                <table className="text-sm border-collapse w-full">
                  <thead>
                    <tr>
                      {preview.headers.map((h, i) => (
                        <th key={i} className="border border-[var(--border-default)] px-3 py-1.5 bg-[var(--bg-body)] text-left">
                          <div className="text-xs text-slate-500 mb-1 font-normal">{h}</div>
                          <select
                            className="text-sm border border-slate-300 rounded px-2 py-1 w-full"
                            value={columnMap[i] ?? 'skip'}
                            onChange={(e) => {
                              const next = [...columnMap];
                              next[i] = e.target.value as MappableField;
                              setColumnMap(next);
                            }}
                          >
                            {ALL_FIELDS.map((f) => (
                              <option key={f} value={f}>
                                {MAPPABLE_FIELD_LABELS[f]}
                              </option>
                            ))}
                          </select>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="border border-[var(--border-default)] px-3 py-1 text-slate-700 truncate max-w-[150px]">
                            {cell || <span className="text-slate-300 italic">empty</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-slate-500">
                {preview.totalRows} data row{preview.totalRows !== 1 ? 's' : ''} detected. Showing first {preview.rows.length}.
              </div>
            </div>
          )}

          {/* Step 3: Preview mapped data */}
          {step === 'preview' && mappedResult && (
            <div className="grid gap-3">
              <p className="text-sm text-slate-600">
                {mappedResult.rows.length} juror{mappedResult.rows.length !== 1 ? 's' : ''} will be imported.
              </p>
              {mappedResult.errors.length > 0 && (
                <div className="text-sm text-amber-700 bg-amber-50 rounded px-3 py-2">
                  {mappedResult.errors.join('; ')}
                </div>
              )}
              <div className="overflow-y-auto max-h-60 border border-[var(--border-default)] rounded">
                <table className="text-sm border-collapse w-full">
                  <thead>
                    <tr className="bg-[var(--bg-body)]">
                      <th className="border-b border-[var(--border-default)] px-3 py-1.5 text-left">#</th>
                      <th className="border-b border-[var(--border-default)] px-3 py-1.5 text-left">Name</th>
                      <th className="border-b border-[var(--border-default)] px-3 py-1.5 text-left">Juror #</th>
                      <th className="border-b border-[var(--border-default)] px-3 py-1.5 text-left">Age</th>
                      <th className="border-b border-[var(--border-default)] px-3 py-1.5 text-left">Race</th>
                      <th className="border-b border-[var(--border-default)] px-3 py-1.5 text-left">Gender</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedResult.rows.slice(0, 20).map((r, i) => (
                      <tr key={i} className={i % 2 ? 'bg-slate-50/50' : ''}>
                        <td className="px-3 py-1 text-slate-400">{i + 1}</td>
                        <td className="px-3 py-1 font-medium">{r.name}</td>
                        <td className="px-3 py-1">{r.jurorNumber ?? ''}</td>
                        <td className="px-3 py-1">{r.age ?? ''}</td>
                        <td className="px-3 py-1">{r.race ?? ''}</td>
                        <td className="px-3 py-1">{r.gender ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {mappedResult.rows.length > 20 && (
                <div className="text-xs text-slate-500">
                  Showing first 20 of {mappedResult.rows.length}.
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-default)] flex justify-between shrink-0">
          <button
            type="button"
            onClick={step === 'paste' ? onCancel : () => setStep(step === 'preview' ? 'map' : 'paste')}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            {step === 'paste' ? 'Cancel' : 'Back'}
          </button>
          <div className="flex gap-2">
            {step === 'paste' && (
              <button
                type="button"
                onClick={advanceToMap}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Next: Map Columns
              </button>
            )}
            {step === 'map' && (
              <button
                type="button"
                onClick={advanceToPreview}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
              >
                Next: Preview
              </button>
            )}
            {step === 'preview' && (
              <button
                type="button"
                onClick={doImport}
                disabled={!mappedResult || mappedResult.rows.length === 0}
                className="rounded bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300"
              >
                Import {mappedResult?.rows.length ?? 0} Jurors
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
