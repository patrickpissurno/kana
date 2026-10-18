import { afterEach, describe, expect, it, vi } from 'vitest';

const TEST_SERVER_URL = 'http://localhost:3001/';
const EXPECTED_LOG_MESSAGE = `Server running at ${TEST_SERVER_URL}`;

const mockServe = vi.fn();
const mockStartDailyCacheEvictionCron = vi.fn();

vi.mock('~/helpers/cron.server', () => ({
  startDailyCacheEvictionCron: () => mockStartDailyCacheEvictionCron(),
}));

vi.mock('bun', async (importOriginal) => {
  const actual = await importOriginal<typeof import('bun')>();
  return {
    ...actual,
    serve: mockServe,
  };
});

const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('index.server', () => {
  it('starts server in development mode and logs server URL', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'development');
    (import.meta.env as Record<string, string>)['NODE_ENV'] = 'development';

    mockServe.mockReturnValue({ url: new URL(TEST_SERVER_URL) });

    await import('./index.server');

    expect(mockServe).toHaveBeenCalledWith(
      expect.objectContaining({
        development: true,
      })
    );
    expect(mockStartDailyCacheEvictionCron).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(EXPECTED_LOG_MESSAGE);
  });

  it('starts server in production mode when NODE_ENV is production', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    (import.meta.env as Record<string, string>)['NODE_ENV'] = 'production';

    mockServe.mockReturnValue({ url: new URL(TEST_SERVER_URL) });

    await import('./index.server');

    expect(mockServe).toHaveBeenCalledWith(
      expect.objectContaining({
        development: false,
      })
    );
    expect(mockStartDailyCacheEvictionCron).toHaveBeenCalled();
  });
});
