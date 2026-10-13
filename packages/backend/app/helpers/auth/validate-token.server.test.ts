import { describe, expect, it } from 'vitest';
import { AES_GCM_IV_LENGTH } from '../config.server';
import { createToken } from './create-token.server';
import { sessionKey } from './derive-session-key.server';
import { validateToken } from './validate-token.server';

const TEST_UUID = '123e4567-e89b-12d3-a456-426614174000';
const FUTURE_EXPIRATION_MS = 60000;
const PAST_EXPIRATION_MS = 1000;
const CORRUPTED_CIPHERTEXT_EXTRA_BYTES = 16;

async function encryptRawPayload(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sessionKey,
    encoder.encode(payload)
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return Buffer.from(combined).toString('base64');
}

describe('validate-token.server', () => {
  it('returns null when token is empty string', async () => {
    const result = await validateToken('');
    expect(result).toBeNull();
  });

  it('returns null when token decoded buffer length is less than or equal to IV length', async () => {
    const shortBuffer = Buffer.alloc(AES_GCM_IV_LENGTH);
    const shortToken = shortBuffer.toString('base64');

    const result = await validateToken(shortToken);
    expect(result).toBeNull();
  });

  it('returns null when ciphertext fails decryption', async () => {
    const corruptBuffer = Buffer.alloc(AES_GCM_IV_LENGTH + CORRUPTED_CIPHERTEXT_EXTRA_BYTES);
    const corruptToken = corruptBuffer.toString('base64');

    const result = await validateToken(corruptToken);
    expect(result).toBeNull();
  });

  it('returns null when decrypted text is not valid JSON', async () => {
    const token = await encryptRawPayload('invalid json payload');

    const result = await validateToken(token);
    expect(result).toBeNull();
  });

  it('returns null when payload does not conform to tokenDataSchema', async () => {
    const token = await encryptRawPayload(
      JSON.stringify({ user_id: 'not-a-uuid', expires_at: 'bad-date' })
    );

    const result = await validateToken(token);
    expect(result).toBeNull();
  });

  it('returns null when token has expired', async () => {
    const token = await createToken({
      user_id: TEST_UUID,
      expires_at: new Date(Date.now() - PAST_EXPIRATION_MS).toISOString(),
    });

    const result = await validateToken(token);
    expect(result).toBeNull();
  });

  it('returns parsed token data for valid, unexpired token', async () => {
    const expiresAt = new Date(Date.now() + FUTURE_EXPIRATION_MS).toISOString();
    const token = await createToken({
      user_id: TEST_UUID,
      expires_at: expiresAt,
    });

    const result = await validateToken(token);
    expect(result).toEqual({
      user_id: TEST_UUID,
      expires_at: expiresAt,
    });
  });
});
