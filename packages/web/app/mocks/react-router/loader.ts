import type { LoaderFunction } from 'react-router';

/**
 * Helper function to mock the arguments for a loader function.
 * @example mockLoaderArgs<typeof loader>({ params: { id: '1' } })
 */
export function mockLoaderArgs<T extends (args: any) => any = LoaderFunction>(
  _args: Partial<Parameters<T>[0]>
): Parameters<T>[0] {
  const args = _args as Partial<Parameters<LoaderFunction>[0]>;

  const url = args.url ?? args.request?.url ?? new URL('http://example.com');
  const request = args.request ?? new Request(url);

  // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
  return {
    request,
    url,
    pattern: args.pattern ?? '',
    params: args.params ?? {},
    context: args.context ?? {},
  } as Parameters<T>[0];
}
