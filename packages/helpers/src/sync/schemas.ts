import { z } from 'zod';

export const MAX_GLYPH_LENGTH = 12;

export const syncQuizEventsSchema = z.object({
  items: z
    .array(
      z.object({
        glyph: z.string().min(1).max(MAX_GLYPH_LENGTH),
        timestamp: z.number().int().positive(),
        event: z.enum(['correct', 'wrong', 'skipped']),
      })
    )
    .min(1),
  totalItems: z.number().int().positive(),
});

export type SyncQuizEventsPayload = z.infer<typeof syncQuizEventsSchema>;

export type QuizEvent = SyncQuizEventsPayload['items'][number];
