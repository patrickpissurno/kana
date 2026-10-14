import type { FetchOptions, FetchParams } from '@kana/helpers/utils/safe-fetch';
import { safeFetch } from '@kana/helpers/utils/safe-fetch';

export type EndpointFn<Props, Result, Error> = (args: {
  safeFetch: typeof safeFetch<Result, Error>;
  props: Props;
}) => ReturnType<typeof safeFetch<Result, Error>>;

/**
 * Helper function used to define new external endpoints.
 */
export function endpoint<Props, Result, Error>(fn: EndpointFn<Props, Result, Error>) {
  return async (props: Props, options?: FetchOptions) => {
    return fn({
      props,
      async safeFetch(url, init) {
        const args: FetchParams = [url, { ...options, ...init }];
        return safeFetch(...args);
      },
    });
  };
}
