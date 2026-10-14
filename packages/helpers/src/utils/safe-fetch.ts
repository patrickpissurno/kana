// oxlint-disable no-magic-numbers
import type {
  ErrorStatusCode,
  UnexpectedErrorStatusCode,
  InfoStatusCode,
  SuccessStatusCode,
  RedirectStatusCode,
} from '../types';
import { safeJSONParse } from './safe-json-parse';

export type FetchOptions = Omit<RequestInit, 'method' | 'headers' | 'body'> & {
  asStream?: boolean;
};

export type FetchParams = [url: URL | RequestInfo, init?: RequestInit & { asStream?: boolean }];

export type FetchErrorResponse<Error> = {
  status: ErrorStatusCode | UnexpectedErrorStatusCode;
  result: undefined;
  error: Error;
};

export type FetchInfoResponse = {
  status: InfoStatusCode;
  result: undefined;
  error: undefined;
};

export type FetchSuccessResponse<Result> = {
  status: SuccessStatusCode;
  result: Result;
  error: undefined;
};

export type FetchRedirectResponse = {
  status: RedirectStatusCode;
  result: undefined;
  error: undefined;
};

export type FetchResponse<Result, Error> = {
  statusText: string;
  headers: Headers;
} & (
  | FetchSuccessResponse<Result>
  | FetchErrorResponse<Error>
  | FetchRedirectResponse
  | FetchInfoResponse
);

/**
 * Similar to fetch but returns a structured response with result and error
 * instead of throwing errors for non-success status codes
 */
export async function safeFetch<Result, Error>(
  ...args: FetchParams
): Promise<FetchResponse<Result, Error>> {
  const [url, init] = args;

  const response = await fetch(url, init);

  if (
    (response.status >= 300 && response.status < 400) ||
    (response.status >= 100 && response.status < 200)
  ) {
    return {
      status: response.status as InfoStatusCode | RedirectStatusCode,
      statusText: response.statusText,
      result: undefined,
      error: undefined,
      headers: response.headers,
    };
  }

  if (init?.asStream && response.status >= 200 && response.status < 300) {
    return {
      status: response.status as SuccessStatusCode,
      statusText: response.statusText,
      result: response.body as Result,
      error: undefined,
      headers: response.headers,
    };
  }

  const text = await response.text().catch(() => undefined);

  const json = text === undefined ? undefined : safeJSONParse(text, undefined);
  const body = (json === undefined ? text : json) as Result;

  if (response.status >= 400 && response.status < 600) {
    return {
      status: response.status as ErrorStatusCode | UnexpectedErrorStatusCode,
      statusText: response.statusText,
      error: body as unknown as Error,
      result: undefined,
      headers: response.headers,
    };
  }

  return {
    status: response.status as SuccessStatusCode,
    statusText: response.statusText,
    result: body,
    error: undefined,
    headers: response.headers,
  };
}
