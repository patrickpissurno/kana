import { describe, expect, it } from 'vitest';
import { HTTP_BAD_REQUEST } from './http-status.server';
import { makeError } from './make-error.server';

const TEST_EMAIL_ERROR = 'Invalid email';
const TEST_SUBMITTED_EMAIL = 'bad';
const TEST_CUSTOM_ERROR = 'Custom error';
const TEST_NON_FIELD_ERROR = 'General error';

describe('makeError', () => {
  it('handles validation error and submittedData from validation result', async () => {
    const res = makeError({
      error: { fieldErrors: { email: TEST_EMAIL_ERROR } },
      submittedData: { email: TEST_SUBMITTED_EMAIL },
    });

    expect(res.status).toBe(HTTP_BAD_REQUEST);
    expect(await res.json()).toMatchObject({
      error: {
        fieldErrors: { email: TEST_EMAIL_ERROR },
      },
    });
  });

  it('handles explicit fieldErrors and nonFieldError without validation error', async () => {
    const res = makeError({
      fieldErrors: { custom: TEST_CUSTOM_ERROR },
      nonFieldError: TEST_NON_FIELD_ERROR,
    });

    expect(res.status).toBe(HTTP_BAD_REQUEST);
    expect(await res.json()).toMatchObject({
      error: {
        fieldErrors: { custom: TEST_CUSTOM_ERROR },
        nonFieldError: TEST_NON_FIELD_ERROR,
      },
    });
  });

  it('returns undefined fieldErrors when no field errors exist', async () => {
    const res = makeError({
      nonFieldError: TEST_NON_FIELD_ERROR,
    });

    expect(res.status).toBe(HTTP_BAD_REQUEST);
    expect(await res.json()).toEqual({
      error: {
        fieldErrors: undefined,
        nonFieldError: TEST_NON_FIELD_ERROR,
      },
    });
  });

  it('returns empty error object when called with empty props', async () => {
    const res = makeError({});

    expect(res.status).toBe(HTTP_BAD_REQUEST);
    expect(await res.json()).toEqual({
      error: {
        fieldErrors: undefined,
        nonFieldError: undefined,
      },
    });
  });
});
