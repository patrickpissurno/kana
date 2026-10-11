import { describe, expect, it, vi } from 'vitest';
import { shuffleArray } from './shuffle-array';

const NUM_1 = 1;
const NUM_2 = 2;
const NUM_3 = 3;
const NUM_4 = 4;
const NUM_5 = 5;

describe('shuffleArray', () => {
  it('returns an empty array when given an empty array', () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it('does not mutate original array and contains the same elements', () => {
    const original = [NUM_1, NUM_2, NUM_3, NUM_4, NUM_5];
    const shuffled = shuffleArray(original);

    expect(shuffled).not.toBe(original);
    expect(shuffled).toHaveLength(original.length);
    expect(shuffled.slice().sort((a, b) => a - b)).toEqual(original.slice().sort((a, b) => a - b));
  });

  it('swaps elements based on Math.random', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const result = shuffleArray([NUM_1, NUM_2, NUM_3]);
    // With Math.random() = 0:
    // i = 2, j = 0 -> swap 2 and 0: [3, 2, 1]
    // i = 1, j = 0 -> swap 1 and 0: [2, 3, 1]
    expect(result).toEqual([NUM_2, NUM_3, NUM_1]);
    vi.restoreAllMocks();
  });
});
