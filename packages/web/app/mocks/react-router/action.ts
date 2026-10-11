import type { ActionFunction } from 'react-router';

/**
 * Helper function to mock the arguments for an action function.
 * @example mockActionArgs<typeof action>({ request })
 */
export function mockActionArgs<T extends (args: any) => any = ActionFunction>(
  _args: Partial<Parameters<T>[0]>
): Parameters<T>[0] {
  const args = _args as Partial<Parameters<ActionFunction>[0]>;

  const url = args.url ?? args.request?.url ?? new URL('http://example.com');
  const request = args.request ?? new Request(url);

  // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
  return {
    request,
    params: args.params ?? {},
    context: args.context ?? {},
  } as Parameters<T>[0];
}
