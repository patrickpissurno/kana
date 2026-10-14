// oxlint-disable typescript/no-empty-object-type
import type { ServerResponse } from '@kana/helpers/types';
import type { FetchOptions, FetchParams } from '@kana/helpers/utils/safe-fetch';
import { safeFetch } from '@kana/helpers/utils/safe-fetch';

type F<R extends ServerResponse> = (...args: FetchParams) => Promise<R>;

export type EndpointFn<Props, R extends ServerResponse> = (args: {
  f: F<R>;
  props: Props;
}) => ReturnType<F<R>>;

/**
 * Helper function used to define new external endpoints.
 */
export function endpoint<Props, R extends ServerResponse>(fn: EndpointFn<Props, R>) {
  return async (props: Props, options?: FetchOptions) => {
    return fn({
      props,
      async f(url, init) {
        const args: FetchParams = [url, { ...options, ...init }];
        const output = await safeFetch<R & { data: {} }, R & { error: {} }>(...args);
        return {
          ...output.result,
          ...output.error,
        } as R;
      },
    });
  };
}
