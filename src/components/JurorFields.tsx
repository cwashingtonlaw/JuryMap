import { useState } from 'react';
import type { Juror, Lean, CustomFactor, PartyRating, QuestionnaireEntry, NoteParty } from '../types/case';
import { NOTE_PARTY_LABELS } from '../types/case';
import { RACE_LABELS, GENDER_LABELS, MARITAL_LABELS } from '../types/demographics';
import LeanControl from './LeanControl';
import FlagChips from './FlagChips';
import FactorScores from './FactorScores';
import DrawingCanvas from './DrawingCanvas';

function parseQAPaste(text: string): QuestionnaireEntry[] {
  const entries: QuestionnaireEntry[] = [];
  const blocks = text.split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    let question = '';
    let answer = '';
    for (const line of lines) {
      const qMatch = line.match(/^Q:\s*(.+)/i);
      const aMatch = line.match(/^A:\s*(.+)/i);
      if (qMatch) question = qMatch[1].trim();
      else if (aMatch) answer = aMatch[1].trim();
    }
    if (question && answer) {
      entries.push({ question, answer });
    }
  }
  return entries;
}

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
          className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2"
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
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
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
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
            placeholder="Age"
            value={juror.identity.age ?? ''}
            onChange={(e) =>
              onChange((d) => {
                d.identity.age = parseInt(e.target.value) || undefined;
              })
            }
          />
          <input
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
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
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-2 text-sm"
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
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-2 text-sm"
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
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-2 text-sm"
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
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
            placeholder="Employer"
            value={juror.employment.employer ?? ''}
            onChange={(e) =>
              onChange((d) => {
                d.employment.employer = e.target.value || undefined;
              })
            }
          />
          <input
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
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
            <div className="flex rounded-md border border-[var(--border-default)] overflow-hidden text-xs font-medium">
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
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]')
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
                  'px-3 py-1 border-l border-[var(--border-default)] transition-colors ' +
                  ((juror.notesMode ?? 'text') === 'drawing'
                    ? 'bg-slate-800 text-white'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]')
                }
              >
                ✍ Handwriting
              </button>
            </div>
          )}
        </div>

        {/* Party context dropdown */}
        {!readOnly && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 whitespace-nowrap">Party:</label>
            <select
              title="Note party context"
              className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 py-1 text-sm flex-1"
              value={juror.noteParty ?? ''}
              onChange={(e) =>
                onChange((d) => {
                  d.noteParty = (e.target.value || undefined) as NoteParty | undefined;
                })
              }
            >
              <option value="">Select party…</option>
              {Object.entries(NOTE_PARTY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        )}

        {(juror.notesMode ?? 'text') === 'text' ? (
          <NotesEditor
            value={juror.notes}
            readOnly={readOnly}
            onChange={(val) => onChange((d) => { d.notes = val; })}
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

      <QuestionnaireSection
        entries={juror.questionnaire ?? []}
        readOnly={readOnly}
        onChange={onChange}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Notes editor with formatting toolbar                               */
/* ------------------------------------------------------------------ */

function renderMarkdownPreview(text: string): React.ReactNode {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Bullet list
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-disc list-inside ml-2 my-1">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside ml-2 my-1">
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(<p key={`p-${i}`} className="my-1">{renderInline(line)}</p>);
    i++;
  }

  return elements;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={match.index}>{match[1]}</strong>);
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function NotesEditor({
  value,
  readOnly,
  onChange,
}: {
  value: string;
  readOnly?: boolean;
  onChange: (val: string) => void;
}) {
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  function wrapSelection(prefix: string, suffix: string) {
    if (!textareaRef) return;
    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const selected = value.slice(start, end);
    const before = value.slice(0, start);
    const after = value.slice(end);
    const newText = before + prefix + selected + suffix + after;
    onChange(newText);
    // Restore cursor after the wrapped text
    requestAnimationFrame(() => {
      textareaRef.focus();
      textareaRef.selectionStart = start + prefix.length;
      textareaRef.selectionEnd = end + prefix.length;
    });
  }

  function insertLinePrefix(prefix: string) {
    if (!textareaRef) return;
    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const selected = value.slice(start, end);
    const lines = selected.split('\n');
    const prefixed = lines.map((line, i) => {
      if (prefix === '1. ') return `${i + 1}. ${line}`;
      return `${prefix}${line}`;
    });
    const before = value.slice(0, start);
    const after = value.slice(end);
    const newText = before + prefixed.join('\n') + after;
    onChange(newText);
  }

  return (
    <div className="grid gap-1">
      {!readOnly && (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => wrapSelection('**', '**')}
            className="px-2 py-0.5 text-xs font-bold rounded border border-[var(--border-default)] hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix('- ')}
            className="px-2 py-0.5 text-xs rounded border border-[var(--border-default)] hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Bullet list"
          >
            &bull; List
          </button>
          <button
            type="button"
            onClick={() => insertLinePrefix('1. ')}
            className="px-2 py-0.5 text-xs rounded border border-[var(--border-default)] hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Numbered list"
          >
            1. List
          </button>
          <button
            type="button"
            onClick={() => {
              if (!textareaRef) return;
              const now = new Date();
              const hh = String(now.getHours()).padStart(2, '0');
              const mm = String(now.getMinutes()).padStart(2, '0');
              const stamp = `[${hh}:${mm}] `;
              const start = textareaRef.selectionStart;
              const before = value.slice(0, start);
              const after = value.slice(start);
              onChange(before + stamp + after);
              requestAnimationFrame(() => {
                textareaRef.focus();
                const pos = start + stamp.length;
                textareaRef.selectionStart = pos;
                textareaRef.selectionEnd = pos;
              });
            }}
            className="px-2 py-0.5 text-xs rounded border border-[var(--border-default)] hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Insert timestamp"
          >
            Time
          </button>
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className={`px-2 py-0.5 text-xs rounded border border-[var(--border-default)] hover:bg-slate-100 dark:hover:bg-slate-800 ${showPreview ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
            title="Toggle preview"
          >
            Preview
          </button>
        </div>
      )}
      {showPreview ? (
        <div className="prose text-sm rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 min-h-[9rem] overflow-y-auto">
          {value ? renderMarkdownPreview(value) : <span className="text-slate-400">Nothing to preview</span>}
        </div>
      ) : (
        <textarea
          ref={setTextareaRef}
          rows={6}
          className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
          value={value}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Demeanor, responses to questions, red flags…"
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Questionnaire section                                              */
/* ------------------------------------------------------------------ */

function QuestionnaireSection({
  entries,
  readOnly,
  onChange,
}: {
  entries: QuestionnaireEntry[];
  readOnly?: boolean;
  onChange: (mutator: (draft: Juror) => void) => void;
}) {
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  function addEntry() {
    const q = newQ.trim();
    const a = newA.trim();
    if (!q || !a) return;
    onChange((d) => {
      d.questionnaire = [...(d.questionnaire ?? []), { question: q, answer: a }];
    });
    setNewQ('');
    setNewA('');
  }

  function removeEntry(idx: number) {
    onChange((d) => {
      const list = [...(d.questionnaire ?? [])];
      list.splice(idx, 1);
      d.questionnaire = list;
    });
  }

  function handlePaste() {
    const parsed = parseQAPaste(pasteText);
    if (parsed.length === 0) return;
    onChange((d) => {
      d.questionnaire = [...(d.questionnaire ?? []), ...parsed];
    });
    setPasteText('');
    setPasteOpen(false);
  }

  return (
    <fieldset className="grid gap-2" disabled={readOnly}>
      <div className="flex items-center justify-between">
        <legend className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Questionnaire ({entries.length})
        </legend>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setPasteOpen(!pasteOpen)}
            className="text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            {pasteOpen ? 'Cancel' : 'Paste Q&A'}
          </button>
        )}
      </div>

      {pasteOpen && (
        <div className="grid gap-2 rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 p-3">
          <textarea
            rows={6}
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm font-mono"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"Q: What is your occupation?\nA: Teacher\n\nQ: Have you ever served on a jury?\nA: Yes, twice"}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">
              {pasteText.trim() ? `${parseQAPaste(pasteText).length} Q&A pair(s) detected` : 'Use Q: and A: prefixes'}
            </span>
            <button
              type="button"
              onClick={handlePaste}
              disabled={!pasteText.trim() || parseQAPaste(pasteText).length === 0}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              Import
            </button>
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <ul className="grid gap-2">
          {entries.map((entry, i) => (
            <li
              key={i}
              className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">
                    {entry.question}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                    {entry.answer}
                  </div>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removeEntry(i)}
                    className="shrink-0 text-slate-400 hover:text-red-600 text-xs leading-none mt-0.5"
                    title="Remove"
                  >
                    x
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <div className="grid gap-1.5">
          <input
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm"
            placeholder="Question"
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
          />
          <input
            className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-1.5 text-sm"
            placeholder="Answer"
            value={newA}
            onChange={(e) => setNewA(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addEntry();
            }}
          />
          <button
            type="button"
            onClick={addEntry}
            disabled={!newQ.trim() || !newA.trim()}
            className="justify-self-start rounded-md border border-[var(--border-default)] px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      )}
    </fieldset>
  );
}
