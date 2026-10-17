import type { StudioStep } from './doc-store';

function letters(answer: string) {
  return answer.toUpperCase().replace(/[^A-Z]/g, '');
}

/**
 * Clue numbers match the grid: one number per starting cell,
 * scanned top to bottom, then left to right. Authoring order is ignored.
 * Two words that start on the same square share that number.
 */
export function clueNumberById(steps: StudioStep[]): Map<string, number> {
  const startCells: Array<{ row: number; col: number }> = [];
  const seen = new Set<string>();
  for (const step of steps) {
    if (step.row == null || step.col == null || !letters(step.answer)) continue;
    const key = `${step.row}:${step.col}`;
    if (seen.has(key)) continue;
    seen.add(key);
    startCells.push({ row: step.row, col: step.col });
  }
  startCells.sort((a, b) => a.row - b.row || a.col - b.col);

  const numberAt = new Map<string, number>();
  startCells.forEach((cell, index) => {
    numberAt.set(`${cell.row}:${cell.col}`, index + 1);
  });

  const byId = new Map<string, number>();
  for (const step of steps) {
    if (step.row == null || step.col == null || !letters(step.answer)) continue;
    const number = numberAt.get(`${step.row}:${step.col}`);
    if (number != null) byId.set(step.id, number);
  }
  return byId;
}
