import type { BunRequest } from 'bun';
import { z, ZodType } from 'zod';
import { HTTP_UNSUPPORTED_MEDIA_TYPE } from './http-status.server';

const UNSUPPORTED_MEDIA_TYPE_RESPONSE = new Response(null, { status: HTTP_UNSUPPORTED_MEDIA_TYPE });

export async function parseJSONData<T extends ZodType>(req: BunRequest, schema: T) {
  let json: unknown = undefined;
  try {
    json = await req.json();
  } catch {
    throw UNSUPPORTED_MEDIA_TYPE_RESPONSE.clone();
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
