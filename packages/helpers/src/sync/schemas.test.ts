import { describe, expect, it } from 'vitest';
import {
  MAX_GLYPH_LENGTH,
  quizEventSchema,
  quizResultSchema,
  syncQuizEventsSchema,
} from './schemas';

const VALID_TIMESTAMP = 1728987654321;
const EXPECTED_MAX_GLYPH_LENGTH = 12;
const TOO_LONG_GLYPH = 'a'.repeat(MAX_GLYPH_LENGTH + 1);

describe('sync schemas', () => {
  describe('MAX_GLYPH_LENGTH', () => {
    it('defines maximum glyph length', () => {
      expect(MAX_GLYPH_LENGTH).toBe(EXPECTED_MAX_GLYPH_LENGTH);
    });
  });

  describe('quizResultSchema', () => {
    it('accepts correct, wrong, and skipped', () => {
      expect(quizResultSchema.safeParse('correct').success).toBe(true);
      expect(quizResultSchema.safeParse('wrong').success).toBe(true);
      expect(quizResultSchema.safeParse('skipped').success).toBe(true);
    });

    it('rejects invalid result values', () => {
      expect(quizResultSchema.safeParse('other').success).toBe(false);
      expect(quizResultSchema.safeParse('').success).toBe(false);
    });
  });

  describe('quizEventSchema', () => {
    it('accepts a valid quiz event', () => {
      const parsed = quizEventSchema.safeParse({
        glyph: 'あ',
        timestamp: VALID_TIMESTAMP,
        result: 'correct',
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects empty glyph', () => {
      const parsed = quizEventSchema.safeParse({
        glyph: '',
        timestamp: VALID_TIMESTAMP,
        result: 'correct',
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects glyph exceeding maximum length', () => {
      const parsed = quizEventSchema.safeParse({
        glyph: TOO_LONG_GLYPH,
        timestamp: VALID_TIMESTAMP,
        result: 'correct',
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects non-positive timestamp', () => {
      expect(
        quizEventSchema.safeParse({
          glyph: 'あ',
          timestamp: 0,
          result: 'correct',
        }).success
      ).toBe(false);

      expect(
        quizEventSchema.safeParse({
          glyph: 'あ',
          timestamp: -1,
          result: 'correct',
        }).success
      ).toBe(false);
    });

    it('rejects float timestamp', () => {
      expect(
        quizEventSchema.safeParse({
          glyph: 'あ',
          timestamp: 123.45,
          result: 'correct',
        }).success
      ).toBe(false);
    });
  });

  describe('syncQuizEventsSchema', () => {
    it('accepts payload with valid items and positive totalItems', () => {
      const parsed = syncQuizEventsSchema.safeParse({
        items: [
          {
            glyph: 'あ',
            timestamp: VALID_TIMESTAMP,
            result: 'correct',
          },
        ],
        totalItems: 1,
      });

      expect(parsed.success).toBe(true);
    });

    it('defaults items to empty array if omitted and accepts 0 totalItems', () => {
      const parsed = syncQuizEventsSchema.safeParse({
        totalItems: 0,
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.items).toEqual([]);
        expect(parsed.data.totalItems).toBe(0);
      }
    });

    it('accepts explicit empty items array', () => {
      const parsed = syncQuizEventsSchema.safeParse({
        items: [],
        totalItems: 0,
      });

      expect(parsed.success).toBe(true);
    });

    it('rejects negative totalItems', () => {
      const parsed = syncQuizEventsSchema.safeParse({
        items: [],
        totalItems: -1,
      });

      expect(parsed.success).toBe(false);
    });

    it('rejects non-integer totalItems', () => {
      const parsed = syncQuizEventsSchema.safeParse({
        items: [],
        totalItems: 1.5,
      });

      expect(parsed.success).toBe(false);
    });
  });
});
