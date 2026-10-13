import type { Serve } from 'bun';

export function defineRoutes<
  R extends string,
  const T extends Serve.Options<undefined, R>['routes'],
>(routes: T & Serve.Options<undefined, R>['routes']): T {
  return routes;
}
