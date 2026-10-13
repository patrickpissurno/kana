import { serve } from 'bun';
import { healthRoutes } from './routes/health/route.server';

const IS_DEV = import.meta.env.NODE_ENV !== 'production';

const server = serve({
  development: IS_DEV,
  routes: {
    ...healthRoutes,
  },
});

// oxlint-disable-next-line no-console
console.log(`Server running at ${server.url}`);
