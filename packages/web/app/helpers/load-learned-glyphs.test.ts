import { describe, expect, it, vi } from 'vitest';
import { QUIZ_RESULT } from '../types/quiz';
import { appendQuizEvent } from './append-quiz-event';
import { loadLearnedGlyphs } from './load-learned-glyphs';
import { updateQuizEvent } from './update-quiz-event';

const TIME_A = 1_700_000_000_000;
const TIME_I = 1_700_000_001_000;
const TIME_U = 1_700_000_002_000;

describe('loadLearnedGlyphs', () => {
  it('returns empty array when candidate list is empty', async () => {
    const result = await loadLearnedGlyphs([]);
    expect(result).toEqual([]);
  });

  it('filters candidates to only those with correct quiz results', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(TIME_A);
    const timestampA = await appendQuizEvent('あ');
    await updateQuizEvent(timestampA, QUIZ_RESULT.CORRECT);

    vi.setSystemTime(TIME_I);
    const timestampI = await appendQuizEvent('い');
    await updateQuizEvent(timestampI, QUIZ_RESULT.WRONG);

    vi.setSystemTime(TIME_U);
    // skipped result
    await appendQuizEvent('う');
    vi.useRealTimers();

    const result = await loadLearnedGlyphs(['あ', 'い', 'う', 'え']);
    expect(result).toEqual(['あ']);
  });

  it('rejects when index.getAll triggers an error with DOMException', async () => {
    const testError = new DOMException('Index query failed', 'AbortError');
    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const fakeIndex = {
        getAll: () => {
          const req = {
            result: undefined,
            error: testError,
            onsuccess: null,
            onerror: null,
          } as unknown as IDBRequest;

          queueMicrotask(() => {
            if (req.onerror) {
              req.onerror(new Event('error'));
            }
          });
          return req;
        },
      };

      const fakeStore = {
        index: () => fakeIndex,
      };

      const fakeDb = {
        transaction: () => ({
          objectStore: () => fakeStore,
        }),
      };

      const req = {
        result: fakeDb,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      } as unknown as IDBOpenDBRequest;

      queueMicrotask(() => {
        if (req.onsuccess) {
          req.onsuccess(new Event('success'));
        }
      });
      return req;
    });

    await expect(loadLearnedGlyphs(['あ'])).rejects.toThrow('Index query failed');
    indexedDB.open = originalOpen;
  });

  it('rejects when index.getAll triggers an error without DOMException', async () => {
    const originalOpen = indexedDB.open;

    vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      const fakeIndex = {
        getAll: () => {
          const req = {
            result: undefined,
            error: null,
            onsuccess: null,
            onerror: null,
          } as unknown as IDBRequest;

          queueMicrotask(() => {
            if (req.onerror) {
              req.onerror(new Event('error'));
            }
          });
          return req;
        },
      };

      const fakeStore = {
        index: () => fakeIndex,
      };

      const fakeDb = {
        transaction: () => ({
          objectStore: () => fakeStore,
        }),
      };

      const req = {
        result: fakeDb,
        error: null,
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      } as unknown as IDBOpenDBRequest;

      queueMicrotask(() => {
        if (req.onsuccess) {
          req.onsuccess(new Event('success'));
        }
      });
      return req;
    });

    await expect(loadLearnedGlyphs(['あ'])).rejects.toThrow('Failed to query events for glyph: あ');
    indexedDB.open = originalOpen;
  });
});
