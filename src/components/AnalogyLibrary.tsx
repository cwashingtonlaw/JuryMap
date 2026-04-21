import {
  ANALOGIES,
  TOPIC_LABELS,
  type AnalogyTopic,
} from '../content/analogies';

interface Props {
  onPick: (analogyId: string) => void;
  onClose: () => void;
}

export default function AnalogyLibrary({ onPick, onClose }: Props) {
  const byTopic = new Map<AnalogyTopic, typeof ANALOGIES>();
  for (const a of ANALOGIES) {
    const list = byTopic.get(a.topic) ?? [];
    list.push(a);
    byTopic.set(a.topic, list);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-md shadow-xl p-6 w-[640px] max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Walk through an analogy</h2>
          <button
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            Close (Esc)
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Pick a framework. The prompter will walk you through the steps and
          let your spotter record the juror&apos;s responses in the record.
        </p>

        <div className="grid gap-5">
          {(Object.keys(TOPIC_LABELS) as AnalogyTopic[]).map((topic) => {
            const list = byTopic.get(topic) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={topic}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  {TOPIC_LABELS[topic]}
                </h3>
                <ul className="grid gap-2">
                  {list.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => onPick(a.id)}
                        className="w-full text-left rounded-md border border-slate-200 bg-white px-4 py-3 hover:border-slate-400"
                      >
                        <div className="text-sm font-medium text-slate-900">
                          {a.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {a.summary}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
