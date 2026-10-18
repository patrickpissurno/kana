import { z } from 'zod';
import type { ServerResponse } from '../types';

export const MAX_GLYPH_LENGTH = 12;

export const QUIZ_RESULT = {
  SKIPPED: 1,
  WRONG: 2,
  CORRECT: 3,
} as const;

export const quizResultSchema = z.union([
  z.literal(QUIZ_RESULT.SKIPPED),
  z.literal(QUIZ_RESULT.WRONG),
  z.literal(QUIZ_RESULT.CORRECT),
]);

export type QuizResult = (typeof QUIZ_RESULT)[keyof typeof QUIZ_RESULT];

export const quizEventSchema = z.object({
  glyph: z.string().min(1).max(MAX_GLYPH_LENGTH),
  timestamp: z.number().int().positive(),
  result: quizResultSchema,
});

export type QuizEvent = z.infer<typeof quizEventSchema>;

export const syncQuizEventsDataSchema = z.object({
  timestamps: z.array(z.number().int().positive()),
  glyphs: z.array(z.string().min(1).max(MAX_GLYPH_LENGTH)),
  results: z.array(quizResultSchema),
});

export type SyncQuizEventsData = z.infer<typeof syncQuizEventsDataSchema>;

export const syncQuizEventsPayloadSchema = syncQuizEventsDataSchema.refine(
  (data) =>
    data.timestamps.length === data.glyphs.length && data.timestamps.length === data.results.length,
  {
    message: 'Array lengths must match',
  }
);

export type SyncQuizEventsPayload = z.infer<typeof syncQuizEventsPayloadSchema>;

export const syncQuizEventsSchema = syncQuizEventsPayloadSchema;

export type SyncQuizEventsResponse = ServerResponse<SyncQuizEventsData>;
