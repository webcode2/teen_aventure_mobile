import type { StudioStep } from './doc-store';

type Props = {
  steps: StudioStep[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<StudioStep>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
};

function letters(answer: string) {
  return answer.toUpperCase().replace(/[^A-Z]/g, '');
}

export function WordListEditor({
  steps,
  selectedId,
  onSelect,
  onChange,
  onAdd,
  onRemove,
}: Props) {
  const selected = steps.find((s) => s.id === selectedId) ?? null;
  const selectedIndex = selected ? steps.findIndex((s) => s.id === selected.id) : -1;

  return (
    <div className="bg-surface border border-border rounded-card p-4 shadow-xs flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-navy m-0">Words</h3>
          <p className="text-[11px] text-muted m-0 mt-0.5 text-pretty">
            Type the answer, then click the grid to place it.
          </p>
        </div>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg bg-navy hover:bg-teal text-white text-xs font-semibold transition-colors cursor-pointer"
          onClick={onAdd}
        >
          + Add word
        </button>
      </div>

      <div className="studio-word-bar">
        {steps.length === 0 ? (
          <p className="text-xs text-muted m-0">No words yet — add your first answer.</p>
        ) : (
          steps.map((step, i) => {
            const placed = step.row != null && step.col != null;
            const label = letters(step.answer) || `Word ${i + 1}`;
            return (
              <button
                key={step.id}
                type="button"
                className={`studio-word-chip ${step.id === selectedId ? 'is-active' : ''} ${!placed ? 'is-unplaced' : ''}`}
                onClick={() => onSelect(step.id)}
              >
                <span className="tabular-nums text-[10px] opacity-70">{i + 1}</span>
                {label}
                {!placed ? <span className="text-[10px] font-semibold opacity-70">place</span> : null}
              </button>
            );
          })
        )}
      </div>

      {selected ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-cream p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-navy">
              Word {selectedIndex + 1}
              {selected.row != null ? ` · @${selected.row},${selected.col}` : ' · not placed'}
            </span>
            <button
              type="button"
              className="text-xs font-semibold text-error hover:underline cursor-pointer bg-transparent border-0"
              onClick={() => onRemove(selected.id)}
            >
              Remove
            </button>
          </div>

          <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
            Answer (as on the game grid)
            <input
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm uppercase tracking-wider font-bold text-navy focus:outline-none focus:ring-2 focus:ring-teal/30"
              value={selected.answer}
              placeholder="e.g. JAEL"
              autoFocus={!letters(selected.answer)}
              onChange={(e) => onChange(selected.id, { answer: e.target.value.toUpperCase() })}
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold border transition-colors cursor-pointer ${
                selected.direction === 'across'
                  ? 'bg-navy text-white border-navy'
                  : 'bg-surface text-navy border-border hover:border-navy'
              }`}
              onClick={() => onChange(selected.id, { direction: 'across' })}
            >
              Across →
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold border transition-colors cursor-pointer ${
                selected.direction === 'down'
                  ? 'bg-navy text-white border-navy'
                  : 'bg-surface text-navy border-border hover:border-navy'
              }`}
              onClick={() => onChange(selected.id, { direction: 'down' })}
            >
              Down ↓
            </button>
          </div>

          <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
            Clue
            <textarea
              rows={2}
              value={selected.clue}
              placeholder="Clue the teen will see"
              onChange={(e) => onChange(selected.id, { clue: e.target.value })}
              className="w-full rounded-lg border border-border bg-surface p-2.5 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 font-sans leading-relaxed"
            />
          </label>

          <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
            Scripture
            <input
              value={selected.ref}
              placeholder="Judges 4:21"
              onChange={(e) => onChange(selected.id, { ref: e.target.value })}
              className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30"
            />
          </label>
        </div>
      ) : steps.length > 0 ? (
        <p className="text-xs text-muted m-0">Select a word chip to edit its answer and clue.</p>
      ) : null}
    </div>
  );
}
