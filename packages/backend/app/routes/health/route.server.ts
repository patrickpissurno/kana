import { defineRoutes } from '../../helpers/define-routes';

export const healthRoutes = defineRoutes({
  '/health': {
    GET: Response.json({ status: 'ok' }),
  },
});
