import { useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import {
  cascadeReflow,
  chainGhosts,
  placeOnGhost,
  snapToCrossing,
  type GhostAnchor,
  type PlacedWord,
} from '@askhub/puzzles/snap.ts';
import type { StudioStep } from './doc-store';
import './studio.css';

const CELL = 36;
const MIN_GRID = 12;

type Props = {
  steps: StudioStep[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPlace: (id: string, row: number, col: number, fromLetter?: number) => void;
  onCommitPlacements: (
    updates: Array<{ id: string; row: number; col: number; fromLetter?: number }>,
  ) => void;
  /** Live answer typing from the grid keyboard. */
  onAnswerChange: (id: string, answer: string) => void;
  /** Click empty cell → create & place a new word there for typing. */
  onStartWordAt: (row: number, col: number) => void;
  highlightCell?: { row: number; col: number } | null;
};

function lettersOnly(answer: string) {
  return answer.toUpperCase().replace(/[^A-Z]/g, '');
}

function toPlaced(steps: StudioStep[]): PlacedWord[] {
  return steps
    .filter((s) => s.row != null && s.col != null && lettersOnly(s.answer).length > 0)
    .map((s) => ({
      id: s.id,
      row: s.row!,
      col: s.col!,
      direction: s.direction,
      answer: s.answer,
    }));
}

export function PuzzleCanvas({
  steps,
  selectedId,
  onSelect,
  onPlace,
  onCommitPlacements,
  onAnswerChange,
  onStartWordAt,
  highlightCell,
}: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const board = useMemo(() => toPlaced(steps), [steps]);
  const selected = steps.find((s) => s.id === selectedId) ?? null;
  const selectedIdx = selected ? steps.findIndex((s) => s.id === selected.id) : -1;
  const prev = selectedIdx > 0 ? steps[selectedIdx - 1] : null;
  const [cursor, setCursor] = useState(0);

  const ghosts: GhostAnchor[] = useMemo(() => {
    if (!selected || !prev || prev.row == null || prev.col == null) return [];
    if (!lettersOnly(selected.answer)) return [];
    const prevPlaced: PlacedWord = {
      id: prev.id,
      row: prev.row,
      col: prev.col,
      direction: prev.direction,
      answer: prev.answer,
    };
    return chainGhosts(prevPlaced, selected.answer);
  }, [selected, prev]);

  const drag = useRef<{
    id: string;
    originRow: number;
    originCol: number;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const [preview, setPreview] = useState<{ id: string; row: number; col: number } | null>(null);

  const gridNeedRows = Math.max(
    MIN_GRID,
    ...board.map((w) => w.row + lettersOnly(w.answer).length + 1),
    ...(preview ? [preview.row + 8] : []),
    ...(ghosts.map((g) => g.row + 2)),
  );
  const gridNeedCols = Math.max(
    MIN_GRID,
    ...board.map((w) => w.col + lettersOnly(w.answer).length + 1),
    ...(preview ? [preview.col + 8] : []),
    ...(ghosts.map((g) => g.col + 2)),
  );
  // Grow-only — resizing the grid on every keystroke remounts cells and looks like flicker.
  const gridSize = useRef({ rows: MIN_GRID, cols: MIN_GRID });
  if (gridNeedRows > gridSize.current.rows) gridSize.current.rows = gridNeedRows;
  if (gridNeedCols > gridSize.current.cols) gridSize.current.cols = gridNeedCols;
  const gridRows = gridSize.current.rows;
  const gridCols = gridSize.current.cols;

  function placeSelectedAt(row: number, col: number) {
    if (!selected || !lettersOnly(selected.answer)) return;
    const ghost = ghosts.find((g) => g.row === row && g.col === col);
    if (ghost) {
      const next: PlacedWord = {
        id: selected.id,
        row: selected.row ?? 0,
        col: selected.col ?? 0,
        direction: selected.direction,
        answer: selected.answer,
      };
      const result = placeOnGhost(board.filter((w) => w.id !== selected.id), next, ghost);
      if (result.ok) {
        onPlace(selected.id, result.placed.row, result.placed.col, ghost.letterIndex);
      }
      return;
    }
    onPlace(selected.id, row, col, selected.fromLetter);
  }

  function onPointerDown(e: ReactPointerEvent, step: StudioStep) {
    if (step.row == null || step.col == null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      id: step.id,
      originRow: step.row,
      originCol: step.col,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
    onSelect(step.id);
  }

  function onPointerMove(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dCol = Math.round((e.clientX - d.startX) / CELL);
    const dRow = Math.round((e.clientY - d.startY) / CELL);
    if (dCol !== 0 || dRow !== 0) d.moved = true;
    const step = steps.find((s) => s.id === d.id);
    if (!step) return;
    const incoming = {
      id: step.id,
      row: d.originRow + dRow,
      col: d.originCol + dCol,
      direction: step.direction,
      answer: step.answer,
    };
    const snap = snapToCrossing(
      board.filter((w) => w.id !== step.id),
      incoming,
      {
        preferGhosts: ghosts.filter(
          (g) => g.toAnswer === lettersOnly(step.answer),
        ),
        radius: 2,
      },
    );
    setPreview({ id: step.id, row: snap.row, col: snap.col });
  }

  function onPointerUp(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const step = steps.find((s) => s.id === d.id);
    const row = preview?.id === d.id ? preview.row : d.originRow;
    const col = preview?.id === d.id ? preview.col : d.originCol;
    if (step && d.moved) {
      const ghost = ghosts.find((g) => g.row === row && g.col === col);
      const order = steps.map((s) => s.id);
      const links = steps
        .map((s, i) =>
          i === 0 || s.fromLetter == null
            ? null
            : {
                fromEntryId: steps[i - 1]!.id,
                toEntryId: s.id,
                letterIndex: s.fromLetter,
              },
        )
        .filter(Boolean) as Array<{ fromEntryId: string; toEntryId: string; letterIndex: number }>;

      const placedNow: PlacedWord[] = steps.map((s) => ({
        id: s.id,
        row: s.id === step.id ? row : (s.row ?? 0),
        col: s.id === step.id ? col : (s.col ?? 0),
        direction: s.direction,
        answer: s.answer,
      }));
      const reflowed = cascadeReflow(placedNow, order, links, step.id);
      const updates = reflowed
        .filter((p) => {
          const orig = steps.find((s) => s.id === p.id);
          if (!orig) return false;
          if (p.id === step.id) return true;
          return orig.row !== p.row || orig.col !== p.col;
        })
        .map((p) => ({
          id: p.id,
          row: p.row,
          col: p.col,
          ...(p.id === step.id && ghost ? { fromLetter: ghost.letterIndex } : {}),
        }));
      onCommitPlacements(updates);
    }
    drag.current = null;
    setPreview(null);
  }

  const occupancy = useMemo(() => {
    const map = new Map<string, { letter: string; number?: number; wordId?: string }>();
    for (const w of board) {
      const answer = lettersOnly(w.answer);
      for (let i = 0; i < answer.length; i++) {
        const r = w.direction === 'down' ? w.row + i : w.row;
        const c = w.direction === 'across' ? w.col + i : w.col;
        const key = `${r}:${c}`;
        const prevCell = map.get(key);
        map.set(key, {
          letter: answer[i]!,
          number: i === 0 ? (prevCell?.number ?? undefined) : prevCell?.number,
          wordId: w.id,
        });
      }
    }
    const numbered = steps
      .filter((x) => x.row != null && x.col != null && lettersOnly(x.answer))
      .slice()
      .sort((a, b) => a.row! - b.row! || a.col! - b.col!);
    for (let i = 0; i < numbered.length; i++) {
      const s = numbered[i]!;
      const key = `${s.row}:${s.col}`;
      const cell = map.get(key);
      if (cell) map.set(key, { ...cell, number: i + 1 });
    }
    if (preview) {
      const step = steps.find((s) => s.id === preview.id);
      if (step) {
        const answer = lettersOnly(step.answer);
        for (let i = 0; i < answer.length; i++) {
          const r = step.direction === 'down' ? preview.row + i : preview.row;
          const c = step.direction === 'across' ? preview.col + i : preview.col;
          map.set(`${r}:${c}`, {
            letter: answer[i]!,
            number: i === 0 ? map.get(`${r}:${c}`)?.number : undefined,
            wordId: step.id,
          });
        }
      }
    }
    return map;
  }, [board, steps, preview]);

  const unplaced = steps.filter((s) => s.row == null || s.col == null);
  const canPlace = Boolean(selected && lettersOnly(selected.answer));
  const selectedLetters = selected ? lettersOnly(selected.answer) : '';
  const typingReady =
    Boolean(selected) && selected!.row != null && selected!.col != null;

  function focusBoard() {
    boardRef.current?.focus({ preventScroll: true });
  }

  function onKeyDown(e: ReactKeyboardEvent) {
    if (!selected || selected.row == null || selected.col == null) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = selectedLetters.slice(0, -1);
      onAnswerChange(selected.id, next);
      setCursor(Math.max(0, next.length));
      return;
    }

    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      e.preventDefault();
      const ch = e.key.toUpperCase();
      const next = (selectedLetters + ch).slice(0, 24);
      onAnswerChange(selected.id, next);
      setCursor(next.length);
      return;
    }

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(selectedLetters.length, c + 1));
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    }
  }

  const cursorCell =
    typingReady && selected
      ? {
          row: selected.direction === 'down' ? selected.row! + cursor : selected.row!,
          col: selected.direction === 'across' ? selected.col! + cursor : selected.col!,
        }
      : null;

  return (
    <div className="studio-board">
      <div className="studio-board__hint">
        {typingReady ? (
          <>
            Click the grid and <strong>type letters</strong> for{' '}
            <strong>{selectedLetters || 'this word'}</strong> ({selected!.direction}). Backspace
            erases. Drag the word to move it.
          </>
        ) : canPlace && (selected?.row == null || selected?.col == null) ? (
          <>
            Click a square to place <strong>{lettersOnly(selected!.answer)}</strong> (
            {selected!.direction}).
          </>
        ) : (
          <>
            Click any empty square and type — the word appears on the board like the game screen.
          </>
        )}
      </div>

      <div
        ref={boardRef}
        className="studio-canvas studio-canvas--play"
        tabIndex={0}
        role="grid"
        aria-label="Puzzle grid — click a cell and type"
        style={{
          width: gridCols * CELL,
          height: gridRows * CELL,
          gridTemplateColumns: `repeat(${gridCols}, ${CELL}px)`,
          gridTemplateRows: `repeat(${gridRows}, ${CELL}px)`,
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        {Array.from({ length: gridRows * gridCols }, (_, i) => {
          const r = Math.floor(i / gridCols);
          const c = i % gridCols;
          const cell = occupancy.get(`${r}:${c}`);
          const isGhost = ghosts.some((g) => g.row === r && g.col === c);
          const isHi = highlightCell?.row === r && highlightCell?.col === c;
          const isSelectedWord = cell?.wordId != null && cell.wordId === selectedId;
          const isPreview = preview != null && cell?.wordId === preview.id;
          const isCursor = cursorCell?.row === r && cursorCell?.col === c;

          const cellClasses = [
            'studio-cell',
            cell ? 'has-letter' : '',
            isGhost ? 'is-ghost' : '',
            isHi ? 'is-locate' : '',
            isSelectedWord ? 'is-selected-word' : '',
            isPreview ? 'is-preview' : '',
            isCursor ? 'is-cursor' : '',
            !cell && canPlace && (selected?.row == null || selected?.col == null) ? 'is-placeable' : '',
            !cell && !canPlace ? 'is-writable' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <div
              key={`${r}:${c}`}
              className={cellClasses}
              onClick={() => {
                if (drag.current?.moved) return;
                const g = ghosts.find((x) => x.row === r && x.col === c);
                if (g) {
                  placeSelectedAt(r, c);
                  focusBoard();
                  return;
                }
                if (cell?.wordId) {
                  onSelect(cell.wordId);
                  const step = steps.find((s) => s.id === cell.wordId);
                  setCursor(step ? lettersOnly(step.answer).length : 0);
                  focusBoard();
                  return;
                }
                if (canPlace && (selected?.row == null || selected?.col == null)) {
                  placeSelectedAt(r, c);
                  setCursor(lettersOnly(selected!.answer).length);
                  focusBoard();
                  return;
                }
                // Empty cell → start typing a new word here
                onStartWordAt(r, c);
                setCursor(0);
                requestAnimationFrame(focusBoard);
              }}
              onPointerDown={(e) => {
                if (!cell?.wordId) return;
                const step = steps.find((s) => s.id === cell.wordId);
                if (step) onPointerDown(e, step);
              }}
              title={
                isGhost
                  ? `Snap here (${ghosts.find((g) => g.row === r && g.col === c)?.letter})`
                  : cell?.letter || 'Type here'
              }
            >
              {cell?.number != null ? (
                <span className="studio-cell-num">{cell.number}</span>
              ) : null}
              {cell?.letter ?? (isGhost ? ghosts.find((g) => g.row === r && g.col === c)?.letter : '')}
            </div>
          );
        })}
      </div>

      {unplaced.length > 0 ? (
        <p className="studio-board__unplaced">
          Not on the grid yet:{' '}
          {unplaced.map((s) => lettersOnly(s.answer) || '(type answer)').join(', ')}
        </p>
      ) : null}
    </div>
  );
}
