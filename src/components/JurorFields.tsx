import type { Juror, Lean } from '../types/case';
import { RACE_LABELS, GENDER_LABELS, MARITAL_LABELS } from '../types/demographics';
import LeanControl from './LeanControl';
import FlagChips from './FlagChips';

interface Props {
  juror: Juror;
  readOnly?: boolean;
  onChange: (mutator: (draft: Juror) => void) => void;
}

export default function JurorFields({ juror, readOnly, onChange }: Props) {
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

      <fieldset className="grid gap-2" disabled={readOnly}>
        <legend className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Notes
        </legend>
        <textarea
          rows={6}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={juror.notes}
          onChange={(e) =>
            onChange((d) => {
              d.notes = e.target.value;
            })
          }
          placeholder="Demeanor, responses to questions, red flags…"
        />
      </fieldset>
    </div>
  );
}
