import { defineRoutes } from '~/helpers/define-routes.server';

export const healthRoutes = defineRoutes({
  '/health': {
    GET: Response.json({ status: 'ok' }),
  },
});
