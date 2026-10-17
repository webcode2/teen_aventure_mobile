import { useMemo } from 'react';
import { compile } from '@askhub/puzzle-contracts';
import type { StudioDoc } from './doc-store';

type Props = {
  doc: StudioDoc;
};

/** Strip canvas coords — CHAIN schema is strict — then compile for numbering. */
function toChainForCompile(doc: StudioDoc) {
  return {
    schemaVersion: 1 as const,
    id: doc.id,
    type: 'CHAIN' as const,
    title: doc.title || 'Untitled',
    scripture: doc.scripture,
    rewards: doc.rewards,
    data: {
      steps: doc.data.steps.map((s) => ({
        id: s.id,
        answer: s.answer || 'X',
        direction: s.direction,
        clue: s.clue || '—',
        ref: s.ref || '—',
        ...(s.fromLetter != null ? { fromLetter: s.fromLetter } : {}),
      })),
    },
  };
}

/** Live numbering preview from compile() — position-based, never authoring order. */
export function NumberingStrip({ doc }: Props) {
  const preview = useMemo(() => {
    if (doc.data.steps.length === 0) {
      return { ok: false as const, issues: [] };
    }
    const result = compile(toChainForCompile(doc));
    if (!result.ok) return { ok: false as const, issues: result.issues };
    const across = result.canonical.data.entries
      .filter((e) => e.direction === 'across')
      .sort((a, b) => a.number - b.number);
    const down = result.canonical.data.entries
      .filter((e) => e.direction === 'down')
      .sort((a, b) => a.number - b.number);
    return { ok: true as const, across, down, grid: result.canonical.data.grid };
  }, [doc]);

  if (!preview.ok) {
    return (
      <div className="bg-surface border border-border rounded-card p-4 shadow-xs flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
          <h3 className="text-sm font-bold text-navy">Numbering</h3>
        </div>
        <p className="text-xs text-muted">Fix chain issues to preview numbers.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-card p-4 shadow-xs flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
        <h3 className="text-sm font-bold text-navy">Numbering</h3>
        <span className="text-xs text-muted font-mono">
          {preview.grid.rows}×{preview.grid.cols}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">Across</h4>
          <ol className="m-0 pl-4 text-xs text-navy space-y-1">
            {preview.across.map((e) => (
              <li key={e.id}>
                <strong>{e.number}.</strong> {e.answer}
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">Down</h4>
          <ol className="m-0 pl-4 text-xs text-navy space-y-1">
            {preview.down.map((e) => (
              <li key={e.id}>
                <strong>{e.number}.</strong> {e.answer}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
