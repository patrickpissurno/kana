import { describe, expect, it } from 'vitest';
import {
  MAX_GLYPH_LENGTH,
  QUIZ_RESULT,
  quizEventSchema,
  quizResultSchema,
  syncQuizEventsDataSchema,
  syncQuizEventsPayloadSchema,
} from './schemas';

const VALID_TIMESTAMP = 1728987654321;
const EXPECTED_MAX_GLYPH_LENGTH = 12;
const TOO_LONG_GLYPH = 'a'.repeat(MAX_GLYPH_LENGTH + 1);
const INVALID_NUMBER_RESULT = 99;
const ZERO_TIMESTAMP = 0;
const NEGATIVE_TIMESTAMP = -1;
const FLOAT_TIMESTAMP = 123.45;

describe('sync schemas', () => {
  describe('MAX_GLYPH_LENGTH', () => {
    it('defines maximum glyph length', () => {
      expect(MAX_GLYPH_LENGTH).toBe(EXPECTED_MAX_GLYPH_LENGTH);
    });
  });

  describe('QUIZ_RESULT', () => {
    it('defines integer constants for quiz results', () => {
      const EXPECTED_SKIPPED = 1;
      const EXPECTED_WRONG = 2;
      const EXPECTED_CORRECT = 3;
      expect(QUIZ_RESULT.SKIPPED).toBe(EXPECTED_SKIPPED);
      expect(QUIZ_RESULT.WRONG).toBe(EXPECTED_WRONG);
      expect(QUIZ_RESULT.CORRECT).toBe(EXPECTED_CORRECT);
    });
  });

  describe('quizResultSchema', () => {
    it('accepts correct (3), wrong (2), and skipped (1)', () => {
      expect(quizResultSchema.safeParse(QUIZ_RESULT.CORRECT).success).toBe(true);
      expect(quizResultSchema.safeParse(QUIZ_RESULT.WRONG).success).toBe(true);
      expect(quizResultSchema.safeParse(QUIZ_RESULT.SKIPPED).success).toBe(true);
    });

    it('rejects invalid result values', () => {
      expect(quizResultSchema.safeParse(INVALID_NUMBER_RESULT).success).toBe(false);
      expect(quizResultSchema.safeParse('correct').success).toBe(false);
      expect(quizResultSchema.safeParse('').success).toBe(false);
    });
  });

  describe('quizEventSchema', () => {
    it('accepts a valid quiz event', () => {
      const parsed = quizEventSchema.safeParse({
        glyph: 'あ',
        timestamp: VALID_TIMESTAMP,
        result: QUIZ_RESULT.CORRECT,
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects empty glyph', () => {
      const parsed = quizEventSchema.safeParse({
        glyph: '',
        timestamp: VALID_TIMESTAMP,
        result: QUIZ_RESULT.CORRECT,
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects glyph exceeding maximum length', () => {
      const parsed = quizEventSchema.safeParse({
        glyph: TOO_LONG_GLYPH,
        timestamp: VALID_TIMESTAMP,
        result: QUIZ_RESULT.CORRECT,
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects non-positive timestamp', () => {
      expect(
        quizEventSchema.safeParse({
          glyph: 'あ',
          timestamp: ZERO_TIMESTAMP,
          result: QUIZ_RESULT.CORRECT,
        }).success
      ).toBe(false);

      expect(
        quizEventSchema.safeParse({
          glyph: 'あ',
          timestamp: NEGATIVE_TIMESTAMP,
          result: QUIZ_RESULT.CORRECT,
        }).success
      ).toBe(false);
    });

    it('rejects float timestamp', () => {
      expect(
        quizEventSchema.safeParse({
          glyph: 'あ',
          timestamp: FLOAT_TIMESTAMP,
          result: QUIZ_RESULT.CORRECT,
        }).success
      ).toBe(false);
    });
  });

  describe('syncQuizEventsDataSchema', () => {
    it('accepts valid columnar data arrays', () => {
      const parsed = syncQuizEventsDataSchema.safeParse({
        timestamps: [VALID_TIMESTAMP],
        glyphs: ['あ'],
        results: [QUIZ_RESULT.CORRECT],
      });
      expect(parsed.success).toBe(true);
    });

    it('accepts empty columnar data arrays', () => {
      const parsed = syncQuizEventsDataSchema.safeParse({
        timestamps: [],
        glyphs: [],
        results: [],
      });
      expect(parsed.success).toBe(true);
    });
  });

  describe('syncQuizEventsPayloadSchema', () => {
    it('accepts matching columnar arrays', () => {
      const parsed = syncQuizEventsPayloadSchema.safeParse({
        timestamps: [VALID_TIMESTAMP],
        glyphs: ['あ'],
        results: [QUIZ_RESULT.CORRECT],
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects mismatched array lengths between timestamps and glyphs', () => {
      const parsed = syncQuizEventsPayloadSchema.safeParse({
        timestamps: [VALID_TIMESTAMP],
        glyphs: [],
        results: [QUIZ_RESULT.CORRECT],
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects mismatched array lengths between timestamps and results', () => {
      const parsed = syncQuizEventsPayloadSchema.safeParse({
        timestamps: [VALID_TIMESTAMP],
        glyphs: ['あ'],
        results: [],
      });
      expect(parsed.success).toBe(false);
    });
  });
});
