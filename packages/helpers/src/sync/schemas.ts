import { z } from 'zod';
import type { ServerResponse } from '../types';

export const MAX_GLYPH_LENGTH = 12;

export const quizResultSchema = z.enum(['correct', 'wrong', 'skipped']);

export const quizEventSchema = z.object({
  glyph: z.string().min(1).max(MAX_GLYPH_LENGTH),
  timestamp: z.number().int().positive(),
  result: quizResultSchema,
});

export const syncQuizEventsSchema = z.object({
  items: z.array(quizEventSchema).default([]),
  totalItems: z.number().int().nonnegative(),
});

export type SyncQuizEventsPayload = z.infer<typeof syncQuizEventsSchema>;

export type QuizEvent = z.infer<typeof quizEventSchema>;

export type QuizResult = z.infer<typeof quizResultSchema>;

export type SyncQuizEventsResponse = ServerResponse<{
  missing: QuizEvent[];
  totalItems: number;
}>;
