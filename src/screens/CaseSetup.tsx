import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCase, populateFirstPanelFromVenire } from '../db/repository';
import { DEFAULT_PEREMPTORY_PRESETS } from '../types/case';
import { parseVenire } from '../lib/venire-import';

type PresetKey = keyof typeof DEFAULT_PEREMPTORY_PRESETS | 'custom';

export default function CaseSetup() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [docketNumber, setDocket] = useState('');
  const [parish, setParish] = useState('');
  const [judge, setJudge] = useState('');
  const [trialDate, setTrialDate] = useState('');
  const [targetJurors, setTargetJurors] = useState(12);
  const [targetAlternates, setTargetAlternates] = useState(2);
  const [preset, setPreset] = useState<PresetKey>('felony-12');
  const [defensePer, setDefensePer] = useState(12);
  const [statePer, setStatePer] = useState(12);
  const [venireSize, setVenireSize] = useState(21);
  const [seatLayout, setSeatLayout] = useState<'rows' | 'snake'>('rows');
  const [error, setError] = useState<string | null>(null);
  const [venireText, setVenireText] = useState('');
  const [venireFeedback, setVenireFeedback] = useState<string | null>(null);

  function onPresetChange(next: PresetKey) {
    setPreset(next);
    if (next !== 'custom') {
      const p = DEFAULT_PEREMPTORY_PRESETS[next];
      setDefensePer(p.defense);
      setStatePer(p.state);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setVenireFeedback(null);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    const c = await createCase({
      name: name.trim(),
      docketNumber: docketNumber.trim() || undefined,
      parish: parish.trim() || undefined,
      judge: judge.trim() || undefined,
      trialDate: trialDate || undefined,
      targetJurors,
      targetAlternates,
      peremptoryBudget: { defense: defensePer, state: statePer },
      venireSize,
      seatLayout,
    });
    if (venireText.trim()) {
      const { rows, errors } = parseVenire(venireText);
      if (errors.length) {
        setVenireFeedback(
          `Venire import had ${errors.length} issue(s): ${errors[0]}`
        );
        return;
      }
      await populateFirstPanelFromVenire(c.id, rows);
    }
    nav(`/cases/${c.id}/questioning`);
  }

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white px-8 py-4">
        <h1 className="text-2xl font-semibold">New Case</h1>
      </header>

      <form className="max-w-2xl p-8 grid gap-4" onSubmit={onSubmit}>
        <label className="grid gap-1">
          <span className="text-sm font-medium">Case name</span>
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="State v. Smith"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-medium">Docket #</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              value={docketNumber}
              onChange={(e) => setDocket(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Trial date</span>
            <input
              type="date"
              className="rounded-md border border-slate-300 px-3 py-2"
              value={trialDate}
              onChange={(e) => setTrialDate(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Parish</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              value={parish}
              onChange={(e) => setParish(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-medium">Judge</span>
            <input
              className="rounded-md border border-slate-300 px-3 py-2"
              value={judge}
              onChange={(e) => setJudge(e.target.value)}
            />
          </label>
        </div>

        <fieldset className="grid gap-3 border border-slate-200 rounded-md p-4">
          <legend className="text-sm font-medium px-1">Jury composition</legend>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1">
              <span className="text-sm">Target jurors</span>
              <input
                type="number"
                min={6}
                max={12}
                className="rounded-md border border-slate-300 px-3 py-2"
                value={targetJurors}
                onChange={(e) => setTargetJurors(parseInt(e.target.value) || 12)}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Target alternates</span>
              <input
                type="number"
                min={0}
                max={6}
                className="rounded-md border border-slate-300 px-3 py-2"
                value={targetAlternates}
                onChange={(e) =>
                  setTargetAlternates(parseInt(e.target.value) || 0)
                }
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="grid gap-3 border border-slate-200 rounded-md p-4">
          <legend className="text-sm font-medium px-1">Peremptory strikes</legend>
          <label className="grid gap-1">
            <span className="text-sm">Peremptory preset</span>
            <select
              className="rounded-md border border-slate-300 px-3 py-2"
              value={preset}
              onChange={(e) => onPresetChange(e.target.value as PresetKey)}
            >
              <option value="capital">Capital (12 per side)</option>
              <option value="felony-12">Felony, 12-juror (12 per side)</option>
              <option value="felony-6">Felony, 6-juror (6 per side)</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1">
              <span className="text-sm">Defense peremptories</span>
              <input
                type="number"
                min={0}
                max={24}
                className="rounded-md border border-slate-300 px-3 py-2"
                value={defensePer}
                onChange={(e) => {
                  setDefensePer(parseInt(e.target.value) || 0);
                  setPreset('custom');
                }}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm">State peremptories</span>
              <input
                type="number"
                min={0}
                max={24}
                className="rounded-md border border-slate-300 px-3 py-2"
                value={statePer}
                onChange={(e) => {
                  setStatePer(parseInt(e.target.value) || 0);
                  setPreset('custom');
                }}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="grid gap-3 border border-slate-200 rounded-md p-4">
          <legend className="text-sm font-medium px-1">
            Venire &amp; seating
          </legend>
          <div className="grid grid-cols-2 gap-4">
            <label className="grid gap-1">
              <span className="text-sm">Venire size</span>
              <select
                className="rounded-md border border-slate-300 px-2 py-2 text-sm"
                value={venireSize}
                onChange={(e) => setVenireSize(parseInt(e.target.value) || 21)}
              >
                <option value={6}>6 (small panel)</option>
                <option value={12}>12</option>
                <option value={21}>21 (LA default)</option>
                <option value={60}>60</option>
                <option value={100}>100</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-sm">Seat layout</span>
              <select
                className="rounded-md border border-slate-300 px-2 py-2 text-sm"
                value={seatLayout}
                onChange={(e) =>
                  setSeatLayout(e.target.value as 'rows' | 'snake')
                }
              >
                <option value="rows">Rows (left-to-right)</option>
                <option value="snake">Snake (alternating direction)</option>
              </select>
            </label>
          </div>
        </fieldset>

        <fieldset className="grid gap-3 border border-slate-200 rounded-md p-4">
          <legend className="text-sm font-medium px-1">
            Venire list (optional)
          </legend>
          <p className="text-xs text-slate-500">
            Paste CSV (with headers including <code>name</code>) or a JSON array.
            First 21 rows will be seated in the initial panel.
          </p>
          <textarea
            rows={6}
            className="rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
            value={venireText}
            onChange={(e) => setVenireText(e.target.value)}
            placeholder={`name,juror_number\nAlice Jones,101\nBob Smith,102`}
          />
          {venireFeedback && (
            <div role="alert" className="text-sm text-amber-700">
              {venireFeedback}
            </div>
          )}
        </fieldset>

        {error && (
          <div role="alert" className="text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Create Case
          </button>
        </div>
      </form>
    </div>
  );
}
