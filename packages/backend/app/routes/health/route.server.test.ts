import { describe, expect, it } from 'vitest';
import { HTTP_OK } from '~/helpers/http-status.server';
import { healthRoutes } from './route.server';

const EXPECTED_HEALTH_STATUS = 'ok';

describe('healthRoutes', () => {
  it('defines GET /health route returning status ok', async () => {
    const route = healthRoutes['/health'];
    expect(route).toBeDefined();

    const res = route.GET;
    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(HTTP_OK);
    expect(await res.clone().json()).toEqual({ status: EXPECTED_HEALTH_STATUS });
  });
});
