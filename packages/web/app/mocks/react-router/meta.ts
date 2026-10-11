import type { MetaFunction } from 'react-router';

type CompatibleMetaFunctionParams = Omit<
  Parameters<MetaFunction>[0],
  'data' | 'loaderData' | 'matches'
> & {
  data: any;
  loaderData: any;
  matches: any;
};

/**
 * Helper function to mock the arguments for a meta function.
 * @example mockMetaArgs<typeof meta>({ loaderData: { id: '1' } })
 */
export function mockMetaArgs<
  T extends (args: any) => any = (args: CompatibleMetaFunctionParams) => any,
>(_args: Omit<Partial<Parameters<T>[0]>, 'data'>): Parameters<T>[0] {
  const args = _args as Omit<Partial<CompatibleMetaFunctionParams>, 'data'>;

  // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
  return {
    params: args.params ?? '',
    location: args.location ?? {},
    matches: args.matches ?? {},
    loaderData: args.loaderData ?? undefined,
    error: args.error ?? undefined,
    data: args.loaderData ?? undefined,
  } as Parameters<T>[0];
}
