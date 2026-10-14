import { originSchema } from '@kana/helpers/schemas/origin';
import { z } from 'zod';

export const schema = z.object({
  VITE_BACKEND_URL: originSchema,
  VITE_SESSION_COOKIE_DATA_NAME: z.string().trim().min(1),
});

export const { VITE_BACKEND_URL, VITE_SESSION_COOKIE_DATA_NAME } = schema.parse(import.meta.env);
