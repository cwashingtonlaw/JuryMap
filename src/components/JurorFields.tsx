import type { Juror, Lean, CustomFactor, PartyRating } from '../types/case';
import { RACE_LABELS, GENDER_LABELS, MARITAL_LABELS } from '../types/demographics';
import LeanControl from './LeanControl';
import FlagChips from './FlagChips';
import FactorScores from './FactorScores';
import DrawingCanvas from './DrawingCanvas';

interface Props {
  juror: Juror;
  factors?: CustomFactor[];
  readOnly?: boolean;
  onChange: (mutator: (draft: Juror) => void) => void;
}

export default function JurorFields({ juror, factors = [], readOnly, onChange }: Props) {
  function set<K extends keyof Juror>(key: K, value: Juror[K]) {
    onChange((d) => {
      (d as any)[key] = value;
    });
  }

  return (
    <div className="grid gap-4">
      <fieldset className="grid gap-2" disabled={readOnly}>
        <legend className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Identity
        </legend>
        <input
          className="rounded-md border border-slate-300 px-3 py-2"
          placeholder="Name"
          value={juror.identity.name}
          onChange={(e) =>
            onChange((d) => {
              d.identity.name = e.target.value;
            })
          }
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Juror #"
            value={juror.identity.jurorNumber ?? ''}
            onChange={(e) =>
              onChange((d) => {
                d.identity.jurorNumber = e.target.value || undefined;
              })
            }
          />
          <input
            type="number"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Age"
            value={juror.identity.age ?? ''}
            onChange={(e) =>
              onChange((d) => {
                d.identity.age = parseInt(e.target.value) || undefined;
              })
            }
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Zip"
            value={juror.identity.zip ?? ''}
            onChange={(e) =>
              onChange((d) => {
                d.identity.zip = e.target.value || undefined;
              })
            }
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-2" disabled={readOnly}>
        <legend className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Demographics
        </legend>
        <div className="grid grid-cols-3 gap-2">
          <select
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
            value={juror.demographics.race}
            onChange={(e) =>
              onChange((d) => {
                d.demographics.race = e.target.value as any;
              })
            }
          >
            {Object.entries(RACE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
            value={juror.demographics.gender}
            onChange={(e) =>
              onChange((d) => {
                d.demographics.gender = e.target.value as any;
              })
            }
          >
            {Object.entries(GENDER_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
            value={juror.demographics.maritalStatus}
            onChange={(e) =>
              onChange((d) => {
                d.demographics.maritalStatus = e.target.value as any;
              })
            }
          >
            {Object.entries(MARITAL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <fieldset className="grid gap-2" disabled={readOnly}>
        <legend className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Employment
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Employer"
            value={juror.employment.employer ?? ''}
            onChange={(e) =>
              onChange((d) => {
                d.employment.employer = e.target.value || undefined;
              })
            }
          />
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Job title"
            value={juror.employment.jobTitle ?? ''}
            onChange={(e) =>
              onChange((d) => {
                d.employment.jobTitle = e.target.value || undefined;
              })
            }
          />
        </div>
      </fieldset>

      <fieldset className="grid gap-2" disabled={readOnly}>
        <legend className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Flags
        </legend>
        <FlagChips
          flags={juror.flags}
          onToggle={(k) =>
            onChange((d) => {
              d.flags[k].value = !d.flags[k].value;
            })
          }
        />
      </fieldset>

      <fieldset className="grid gap-2" disabled={readOnly}>
        <legend className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Lean
        </legend>
        <LeanControl
          value={juror.lean}
          onChange={(v: Lean) => set('lean', v)}
        />
      </fieldset>

      {factors.length > 0 && (
        <fieldset className="grid gap-2" disabled={readOnly}>
          <legend className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Case Factors
          </legend>
          <FactorScores
            factors={factors}
            scores={juror.factorScores ?? {}}
            readOnly={readOnly}
            onChange={(id, score) =>
              onChange((d) => {
                d.factorScores = { ...(d.factorScores ?? {}), [id]: score };
              })
            }
          />
        </fieldset>
      )}

      <fieldset className="grid gap-2" disabled={readOnly}>
        <legend className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Party Ratings
        </legend>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-16 font-medium text-slate-600">Plaintiff</span>
            <div className="flex gap-1">
              {(['unrated', 'green', 'yellow', 'orange', 'red'] as PartyRating[]).map((rating) => (
                <button
                  key={rating}
                  onClick={() => onChange((d) => {
                    if (!d.partyRatings) d.partyRatings = {};
                    d.partyRatings.plaintiff = rating;
                  })}
                  className={`w-6 h-6 rounded-full border ${
                    juror.partyRatings?.plaintiff === rating
                      ? 'ring-2 ring-offset-1 ring-blue-500'
                      : 'border-slate-300 hover:border-slate-400'
                  } ${
                    rating === 'unrated' ? 'bg-slate-100 text-[10px] text-slate-400' :
                    rating === 'green' ? 'bg-green-500' :
                    rating === 'yellow' ? 'bg-yellow-400' :
                    rating === 'orange' ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}
                  title={rating}
                >
                  {rating === 'unrated' && '—'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-16 font-medium text-slate-600">Defense</span>
            <div className="flex gap-1">
              {(['unrated', 'green', 'yellow', 'orange', 'red'] as PartyRating[]).map((rating) => (
                <button
                  key={rating}
                  onClick={() => onChange((d) => {
                    if (!d.partyRatings) d.partyRatings = {};
                    d.partyRatings.defense = rating;
                  })}
                  className={`w-6 h-6 rounded-full border ${
                    juror.partyRatings?.defense === rating
                      ? 'ring-2 ring-offset-1 ring-blue-500'
                      : 'border-slate-300 hover:border-slate-400'
                  } ${
                    rating === 'unrated' ? 'bg-slate-100 text-[10px] text-slate-400' :
                    rating === 'green' ? 'bg-green-500' :
                    rating === 'yellow' ? 'bg-yellow-400' :
                    rating === 'orange' ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}
                  title={rating}
                >
                  {rating === 'unrated' && '—'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <div className="flex items-center justify-between">
          <legend className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            NOTES
          </legend>
          {/* Text ↔ Handwriting toggle */}
          {!readOnly && (
            <div className="flex rounded-md border border-slate-300 overflow-hidden text-xs font-medium">
              <button
                type="button"
                onClick={() =>
                  onChange((d) => {
                    d.notesMode = 'text';
                  })
                }
                className={
                  'px-3 py-1 transition-colors ' +
                  ((juror.notesMode ?? 'text') === 'text'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50')
                }
              >
                Text
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange((d) => {
                    d.notesMode = 'drawing';
                  })
                }
                className={
                  'px-3 py-1 border-l border-slate-300 transition-colors ' +
                  ((juror.notesMode ?? 'text') === 'drawing'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50')
                }
              >
                ✍ Handwriting
              </button>
            </div>
          )}
        </div>

        {(juror.notesMode ?? 'text') === 'text' ? (
          <textarea
            rows={6}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={juror.notes}
            disabled={readOnly}
            onChange={(e) =>
              onChange((d) => {
                d.notes = e.target.value;
              })
            }
            placeholder="Demeanor, responses to questions, red flags…"
          />
        ) : (
          <DrawingCanvas
            value={juror.drawingData ?? ''}
            onChange={(svg) =>
              onChange((d) => {
                d.drawingData = svg;
              })
            }
            readOnly={readOnly}
            canvasWidth={380}
            canvasHeight={240}
          />
        )}
      </fieldset>
    </div>
  );
}
