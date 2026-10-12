import { serve } from 'bun';

const IS_DEV = import.meta.env.NODE_ENV !== 'production';

const server = serve({
  development: IS_DEV,
  routes: {},
});

// oxlint-disable-next-line no-console
console.log(`Server running at ${server.url}`);
