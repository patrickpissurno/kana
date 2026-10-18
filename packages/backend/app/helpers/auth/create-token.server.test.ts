import { describe, expect, it } from 'vitest';
import { AES_GCM_IV_LENGTH } from '../config.server';
import { createToken } from './create-token.server';
import { validateToken } from './validate-token.server';

const TEST_USER_ID = 1;
const TEST_DEVICE_ID = '018f0000-0000-7000-8000-000000000001';
const FUTURE_EXPIRATION_MS = 60000;

describe('create-token.server', () => {
  it('creates a base64 encoded token that can be successfully validated', async () => {
    const payload = {
      user_id: TEST_USER_ID,
      device_id: TEST_DEVICE_ID,
      expires_at: new Date(Date.now() + FUTURE_EXPIRATION_MS).toISOString(),
    };

    const token = await createToken(payload);
    expect(typeof token).toBe('string');

    const buffer = Buffer.from(token, 'base64');
    expect(buffer.length).toBeGreaterThan(AES_GCM_IV_LENGTH);

    const decryptedData = await validateToken(token);
    expect(decryptedData).toEqual(payload);
  });

  it('generates distinct ciphertexts for identical payloads due to random IV', async () => {
    const payload = {
      user_id: TEST_USER_ID,
      device_id: TEST_DEVICE_ID,
      expires_at: new Date(Date.now() + FUTURE_EXPIRATION_MS).toISOString(),
    };

    const tokenA = await createToken(payload);
    const tokenB = await createToken(payload);

    expect(tokenA).not.toBe(tokenB);
  });
});
