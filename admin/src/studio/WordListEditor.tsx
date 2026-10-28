import { useMemo, useState } from 'react';
import type { StudioStep } from './doc-store';
import { clueNumberById } from './clue-numbers';
import { parsePastedWords, type PastedWord } from './paste-words';

type Props = {
  steps: StudioStep[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: Partial<StudioStep>) => void;
  onAdd: () => void;
  onImport: (words: PastedWord[]) => void;
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
  onImport,
  onRemove,
}: Props) {
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const parsed = useMemo(() => parsePastedWords(pasteText), [pasteText]);
  const numbers = useMemo(() => clueNumberById(steps), [steps]);
  const ordered = useMemo(
    () =>
      steps
        .map((step, index) => ({ step, index }))
        .sort((a, b) => {
          const na = numbers.get(a.step.id);
          const nb = numbers.get(b.step.id);
          if (na != null && nb != null) return na - nb || a.index - b.index;
          if (na != null) return -1;
          if (nb != null) return 1;
          return a.index - b.index;
        })
        .map((item) => item.step),
    [numbers, steps],
  );
  const selected = steps.find((s) => s.id === selectedId) ?? null;
  const selectedNumber = selected ? numbers.get(selected.id) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="studio-panel-heading">
        <div><span className="studio-eyebrow">BUILD YOUR PUZZLE</span><h2>Words <span className="studio-count">{steps.length}</span></h2></div>
        <button type="button" className="studio-add" onClick={onAdd}>+ Add word</button>
      </div>
      <button type="button" className="studio-paste-toggle" aria-expanded={pasteOpen} onClick={() => setPasteOpen(!pasteOpen)}>Paste a word list <span aria-hidden="true">{pasteOpen ? '−' : '+'}</span></button>
      {pasteOpen ? (
        <div className="studio-import">
          <label htmlFor="studio-paste">Words to add</label>
          <p id="studio-paste-help">Separate words with commas or new lines. To include clues and scripture, use one row per word: answer | clue | reference. You can also paste three columns from a spreadsheet.</p>
          <textarea id="studio-paste" rows={6} autoFocus value={pasteText} onChange={(e) => setPasteText(e.target.value)} aria-describedby="studio-paste-help" placeholder={'FAITH | Trust in God | Hebrews 11:1\nGRACE | God’s undeserved gift | Ephesians 2:8'} />
          <div aria-live="polite">
            {parsed.errors.map((error) => <p className="studio-import-error" key={error}>{error}</p>)}
            {parsed.words.length > 0 ? <p>{parsed.words.length} words ready: {parsed.words.map((word) => word.answer).join(', ')}</p> : null}
          </div>
          <div className="studio-import-actions">
            <button type="button" className="studio-add" disabled={!parsed.words.length || !!parsed.errors.length} onClick={() => { onImport(parsed.words); setPasteText(''); setPasteOpen(false); }}>Add {parsed.words.length || ''} words</button>
            <button type="button" className="studio-text-button" onClick={() => setPasteOpen(false)}>Cancel</button>
          </div>
        </div>
      ) : null}
      {steps.length === 0 && !pasteOpen ? <div className="studio-empty"><span aria-hidden="true" className="studio-empty-symbol">Aa</span><h3>Start with a few words</h3><p>Add an answer, write a clue, and include its scripture reference. Have a list ready? Paste it above.</p><button type="button" className="studio-text-button" onClick={onAdd}>Add your first word →</button></div> : null}

      {steps.length > 0 ? (
        <div className="studio-word-bar">
          {ordered.map((step) => {
            const placed = step.row != null && step.col != null;
            const number = numbers.get(step.id);
            const label = letters(step.answer) || 'Word';
            const needsScripture = Boolean(letters(step.answer)) && !step.ref.trim();
            return (
              <button
                key={step.id}
                type="button"
                className={`studio-word-chip ${step.id === selectedId ? 'is-active' : ''} ${!placed ? 'is-unplaced' : ''}`}
                aria-pressed={step.id === selectedId}
                onClick={() => onSelect(step.id)}
              >
                {number != null ? <span className="tabular-nums text-[10px] opacity-70">{number}</span> : null}
                {label}
                {needsScripture ? <span className="text-[10px] font-semibold text-orange">scripture</span> : null}
                {!placed ? <span className="text-[10px] font-semibold opacity-70">place</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {selected ? (
        <div className="studio-word-details flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-navy">
              {selectedNumber != null ? `Word ${selectedNumber}` : 'Word'}
            </span>
            <button
              type="button"
              className="cursor-pointer border-0 bg-transparent text-xs font-semibold text-muted hover:text-error"
              onClick={() => onRemove(selected.id)}
            >
              Remove
            </button>
          </div>

          <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
            Answer
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
              aria-pressed={selected.direction === 'across'}
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
              aria-pressed={selected.direction === 'down'}
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
              placeholder="What will help explorers find this answer?"
              onChange={(e) => onChange(selected.id, { clue: e.target.value })}
              className="w-full rounded-lg border border-border bg-surface p-2.5 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 font-sans leading-relaxed"
            />
          </label>

          <label className="flex flex-col gap-1 text-[11px] font-semibold text-muted">
            Scripture
            <span className="font-semibold text-orange"> required</span>
            <input
              required
              aria-required="true"
              value={selected.ref}
              placeholder="Judges 4:21"
              onChange={(e) => onChange(selected.id, { ref: e.target.value })}
              className={`w-full rounded-lg border bg-surface px-2.5 py-1.5 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-teal/30 ${
                selected.ref.trim() ? 'border-border' : 'border-orange'
              }`}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
