import { serve } from 'bun';
import { authRoutes } from '~/routes/auth/route.server';
import { healthRoutes } from '~/routes/health/route.server';

const IS_DEV = import.meta.env.NODE_ENV !== 'production';

const server = serve({
  development: IS_DEV,
  routes: {
    ...healthRoutes,
    ...authRoutes,
  },
});

// oxlint-disable-next-line no-console
console.log(`Server running at ${server.url}`);
