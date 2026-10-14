import type { ServerError } from '@kana/helpers/types';
import type { ValidationResult } from '@rvf/react-router';
import { validationError } from '@rvf/react-router';
import { HTTP_BAD_REQUEST } from './http-status.server';

// oxlint-disable-next-line typescript/no-empty-object-type
export type MakeErrorProps = Partial<ValidationResult<unknown> & { error: {} }> & ServerError;

export function makeError(props: MakeErrorProps) {
  const { data, init } = props.error
    ? validationError(props.error, props.submittedData)
    : { data: undefined };

  const fieldErrors = {
    ...data?.fieldErrors,
    ...props.fieldErrors,
  };

  return Response.json(
    {
      ...data,
      fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
      nonFieldError: props.nonFieldError,
    },
    { ...init, status: HTTP_BAD_REQUEST }
  );
}
