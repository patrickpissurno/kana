import { z } from 'zod';

export const originSchema = z
  .string()
  .trim()
  .regex(/^(http|https):\/\/[a-zA-Z0-9][a-zA-Z0-9-.]*(:[0-9]+)?$/)
  .min(1);
