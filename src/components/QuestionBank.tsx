import { useState } from 'react';
import type { QuestionBankEntry } from '../types/case';
import { newId } from '../lib/id';

interface Props {
  questions: QuestionBankEntry[];
  onAdd: (question: string) => void;
  onRemove: (id: string) => void;
  onSelect: (question: string) => void;
  onClose: () => void;
}

export default function QuestionBank({ questions, onAdd, onRemove, onSelect, onClose }: Props) {
  const [newQuestion, setNewQuestion] = useState('');

  function handleAdd() {
    const q = newQuestion.trim();
    if (!q) return;
    onAdd(q);
    setNewQuestion('');
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-[var(--bg-surface)] rounded-lg shadow-xl w-[550px] max-h-[70vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold">Question Bank</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-lg"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-slate-500 mb-4">
            Add reusable questions to your bank. Click a question to apply it to the current juror.
          </p>

          {questions.length > 0 ? (
            <ul className="grid gap-2 mb-4">
              {questions.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-body)] px-3 py-2 text-sm"
                >
                  <button
                    type="button"
                    onClick={() => onSelect(entry.question)}
                    className="flex-1 text-left text-slate-700 dark:text-slate-300 hover:text-blue-600"
                    title="Click to use this question"
                  >
                    {entry.question}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(entry.id)}
                    className="shrink-0 text-slate-400 hover:text-red-600 text-xs"
                    title="Remove from bank"
                  >
                    x
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-400 italic mb-4">
              No questions in the bank yet. Add your first question below.
            </div>
          )}

          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
              placeholder="Type a new question…"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
              }}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newQuestion.trim()}
              className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white disabled:bg-slate-300"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
