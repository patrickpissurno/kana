import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const MIN_SECRET_LENGTH = 32;
const MIN_SECRET_SALT_LENGTH = 16;

const backup = process.env;

const getEnv = vi.fn();

Object.defineProperty(process, 'env', {
  get: getEnv,
});

beforeEach(() => {
  vi.resetModules();
  getEnv.mockImplementation(() => ({}));
});

afterAll(() => {
  Object.defineProperty(process, 'env', {
    value: backup,
  });
});

describe('config.server', () => {
  it('throws when required variables are missing', async () => {
    await expect(import('./config.server')).rejects.toThrow();
  });

  it('accepts all required variables present', async () => {
    const values = {
      SESSION_SECRET: ` ${'a'.repeat(MIN_SECRET_LENGTH)} `,
      SESSION_SECRET_SALT: ` ${'b'.repeat(MIN_SECRET_SALT_LENGTH)} `,
      SESSION_COOKIE_DOMAIN: ' localhost ',
      SESSION_COOKIE_NAME: ' session ',
      VITE_SESSION_COOKIE_DATA_NAME: ' session-data ',
      CORS_VALID_ORIGINS: ' http://localhost:3000, https://example.com ',
    };

    const expected = {
      SESSION_SECRET: 'a'.repeat(MIN_SECRET_LENGTH),
      SESSION_SECRET_SALT: 'b'.repeat(MIN_SECRET_SALT_LENGTH),
      SESSION_COOKIE_DOMAIN: 'localhost',
      SESSION_COOKIE_NAME: 'session',
      VITE_SESSION_COOKIE_DATA_NAME: 'session-data',
      CORS_VALID_ORIGINS: ['http://localhost:3000', 'https://example.com'],
    };

    getEnv.mockImplementation(() => values);
    const config = await import('./config.server');
    expect(config).toMatchObject(expected);
  });
});
