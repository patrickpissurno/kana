import type { BunRequest } from 'bun';
import type { ZodType } from 'zod';
import { safeJSONParse } from '@kana/helpers/utils/safe-json-parse';
import { z } from 'zod';

export const INVALID_JSON_ERROR = 'Invalid JSON';

export async function parseJSONData<T extends ZodType>(req: BunRequest, schema: T) {
  const text = await req.text().catch(() => '');
  const json = safeJSONParse(text, undefined);

  if (json === undefined) {
    return {
      data: undefined,
      error: { fieldErrors: {} },
      nonFieldError: INVALID_JSON_ERROR,
    };
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    return {
      data: undefined,
      error: { fieldErrors: {} },
      nonFieldError: z.prettifyError(result.error),
    };
  }

  return { data: result.data, error: undefined };
}
