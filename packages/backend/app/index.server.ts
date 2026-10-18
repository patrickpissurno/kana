import { serve } from 'bun';
import { startDailyCacheEvictionCron } from '~/helpers/cron.server';
import { authRoutes } from '~/routes/auth/route.server';
import { healthRoutes } from '~/routes/health/route.server';
import { syncRoutes } from '~/routes/sync/route.server';

const IS_DEV = import.meta.env.NODE_ENV !== 'production';

startDailyCacheEvictionCron();

const server = serve({
  development: IS_DEV,
  routes: {
    ...healthRoutes,
    ...authRoutes,
    ...syncRoutes,
  },
});

// oxlint-disable-next-line no-console
console.log(`Server running at ${server.url}`);
