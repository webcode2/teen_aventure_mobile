import { describe, expect, it } from 'vitest';
import { clueNumberById } from './clue-numbers';
import type { StudioStep } from './doc-store';

function step(partial: Partial<StudioStep> & Pick<StudioStep, 'id' | 'answer'>): StudioStep {
  return {
    direction: 'across',
    clue: '',
    ref: '',
    ...partial,
  };
}

describe('clueNumberById', () => {
  it('numbers by start cell, not the order words were added', () => {
    const steps = [
      step({ id: 'isaac', answer: 'ISAAC', direction: 'down', row: 0, col: 0 }),
      step({ id: 'abraham', answer: 'ABRAHAM', row: 2, col: 0 }),
      step({ id: 'haran', answer: 'HARAN', direction: 'down', row: 2, col: 4 }),
      step({ id: 'nahor', answer: 'NAHOR', row: 6, col: 4 }),
      step({ id: 'aaron', answer: 'AARON', row: 4, col: 3 }),
    ];
    const numbers = clueNumberById(steps);
    expect(numbers.get('isaac')).toBe(1);
    expect(numbers.get('abraham')).toBe(2);
    expect(numbers.get('haran')).toBe(3);
    expect(numbers.get('aaron')).toBe(4);
    expect(numbers.get('nahor')).toBe(5);
  });

  it('gives one number when two words start on the same square', () => {
    const steps = [
      step({ id: 'across', answer: 'JAEL', row: 0, col: 0 }),
      step({ id: 'down', answer: 'JABIN', direction: 'down', row: 0, col: 0 }),
    ];
    const numbers = clueNumberById(steps);
    expect(numbers.get('across')).toBe(1);
    expect(numbers.get('down')).toBe(1);
  });
});
