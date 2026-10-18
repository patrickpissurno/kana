import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import { enforceAuthentication } from '~/helpers/auth/enforce-authentication.server';
import { CORS_VALID_ORIGINS } from '~/helpers/config.server';
import { HTTP_BAD_REQUEST, HTTP_OK, HTTP_UNAUTHORIZED } from '~/helpers/http-status.server';
import { parseJSONData } from '~/helpers/parse-json-data.server';
import { syncQuizEvents } from '~/helpers/sync/quiz-events.server';
import { makeBunRequest } from '~/mocks/bun/bun-request.mock';
import { syncRoutes } from './route.server';

const ORIGIN = CORS_VALID_ORIGINS.at(0)!;
const TEST_USER_ID = 1;
const TEST_DEVICE_ID = '018f0000-0000-7000-8000-000000000001';

vi.mock('~/helpers/auth/enforce-authentication.server', () => ({
  enforceAuthentication: vi.fn(),
}));

vi.mock('~/helpers/parse-json-data.server', () => ({
  parseJSONData: vi.fn(),
}));

vi.mock('~/helpers/sync/quiz-events.server', () => ({
  syncQuizEvents: vi.fn(),
}));

const mockEnforceAuthentication = vi.mocked(enforceAuthentication);
const mockParseJSONData = vi.mocked(parseJSONData);
const mockSyncQuizEvents = vi.mocked(syncQuizEvents);

beforeEach(() => {
  vi.clearAllMocks();
  mockEnforceAuthentication.mockResolvedValue({
    user_id: TEST_USER_ID,
    device_id: TEST_DEVICE_ID,
    expires_at: '2026-10-15T00:00:00.000Z',
  });
});

describe('syncRoutes', () => {
  describe('POST /sync/quiz-events', () => {
    const { POST } = syncRoutes['/sync/quiz-events'];

    test('returns 401 unauthorized when enforceAuthentication throws 401 Response', async () => {
      mockEnforceAuthentication.mockRejectedValueOnce(
        new Response(null, { status: HTTP_UNAUTHORIZED })
      );

      const req = makeBunRequest('http://localhost:3001/sync/quiz-events', {
        method: 'POST',
      });
      req.headers.append('Origin', ORIGIN);

      const res = await POST(req);

      expect(res.status).toBe(HTTP_UNAUTHORIZED);
    });

    test('returns 400 bad request when request body fails validation', async () => {
      mockParseJSONData.mockResolvedValueOnce({
        data: undefined,
        error: { fieldErrors: {} },
        nonFieldError: 'Invalid payload',
      });

      const req = makeBunRequest('http://localhost:3001/sync/quiz-events', {
        method: 'POST',
      });
      req.headers.append('Origin', ORIGIN);

      const res = await POST(req);

      expect(res.status).toBe(HTTP_BAD_REQUEST);
      expect(await res.json()).toMatchObject({
        nonFieldError: 'Invalid payload',
      });
    });

    test('returns 400 bad request when syncQuizEvents returns an error', async () => {
      mockParseJSONData.mockResolvedValueOnce({
        data: { timestamps: [], glyphs: [], results: [] },
        error: undefined,
      });

      mockSyncQuizEvents.mockResolvedValueOnce({
        nonFieldError: 'Database error',
      });

      const req = makeBunRequest('http://localhost:3001/sync/quiz-events', {
        method: 'POST',
      });
      req.headers.append('Origin', ORIGIN);

      const res = await POST(req);

      expect(res.status).toBe(HTTP_BAD_REQUEST);
      expect(await res.json()).toMatchObject({
        nonFieldError: 'Database error',
      });
    });

    it('returns 200 OK with sync result on happy path', async () => {
      const rawJsonResponse = '{"data":{"timestamps":[1000],"glyphs":["a"],"results":[3]}}';

      mockParseJSONData.mockResolvedValueOnce({
        data: { timestamps: [], glyphs: [], results: [] },
        error: undefined,
      });

      mockSyncQuizEvents.mockResolvedValueOnce({
        rawJson: rawJsonResponse,
      });

      const req = makeBunRequest('http://localhost:3001/sync/quiz-events', {
        method: 'POST',
      });
      req.headers.append('Origin', ORIGIN);

      const res = await POST(req);

      expect(res.status).toBe(HTTP_OK);
      expect(await res.json()).toEqual(JSON.parse(rawJsonResponse));
      expect(mockSyncQuizEvents).toHaveBeenCalledWith({
        data: { timestamps: [], glyphs: [], results: [] },
        user_id: TEST_USER_ID,
        device_id: TEST_DEVICE_ID,
      });
    });
  });
});
