import { originSchema } from '@kana/helpers/schemas/origin';
import { z } from 'zod';

export const schema = z.object({
  VITE_BACKEND_URL: originSchema,
});

export const { VITE_BACKEND_URL } = schema.parse(import.meta.env);
