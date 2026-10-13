import { describe, expect, it } from 'vitest';
import {
  EMAIL_ERROR_MESSAGE,
  INVALID_EMAIL_OR_PASSWORD_MESSAGE,
  loginSchema,
  NAME_ERROR_MESSAGE,
  PASSWORD_EMPTY_ERROR_MESSAGE,
  PASSWORD_ERROR_MESSAGE,
  registerSchema,
  tokenDataSchema,
} from './schemas.server';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('schemas.server', () => {
  describe('exported constants', () => {
    it('exports user-facing error messages', () => {
      expect(PASSWORD_ERROR_MESSAGE).toBeDefined();
      expect(NAME_ERROR_MESSAGE).toBeDefined();
      expect(EMAIL_ERROR_MESSAGE).toBeDefined();
      expect(PASSWORD_EMPTY_ERROR_MESSAGE).toBeDefined();
      expect(INVALID_EMAIL_OR_PASSWORD_MESSAGE).toBeDefined();
    });
  });

  describe('registerSchema', () => {
    it('accepts valid input and trims strings', () => {
      const parsed = registerSchema.safeParse({
        email: '  test@example.com  ',
        password: '  Password1!  ',
        name: '  Test User  ',
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.email).toBe('test@example.com');
        expect(parsed.data.password).toBe('Password1!');
        expect(parsed.data.name).toBe('Test User');
      }
    });

    it('rejects invalid email address', () => {
      const parsed = registerSchema.safeParse({
        email: 'not-an-email',
        password: 'Password1!',
        name: 'Test',
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const messages = parsed.error.issues.map((issue) => issue.message);
        expect(messages).toContain(EMAIL_ERROR_MESSAGE);
      }
    });

    it('rejects password shorter than 8 characters', () => {
      const parsed = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Pass1!',
        name: 'Test',
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const messages = parsed.error.issues.map((issue) => issue.message);
        expect(messages).toContain(PASSWORD_ERROR_MESSAGE);
      }
    });

    it('rejects password without lowercase character', () => {
      const parsed = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'PASSWORD1!',
        name: 'Test',
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const messages = parsed.error.issues.map((issue) => issue.message);
        expect(messages).toContain(PASSWORD_ERROR_MESSAGE);
      }
    });

    it('rejects password without uppercase character', () => {
      const parsed = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'password1!',
        name: 'Test',
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const messages = parsed.error.issues.map((issue) => issue.message);
        expect(messages).toContain(PASSWORD_ERROR_MESSAGE);
      }
    });

    it('rejects password without number', () => {
      const parsed = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password!',
        name: 'Test',
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const messages = parsed.error.issues.map((issue) => issue.message);
        expect(messages).toContain(PASSWORD_ERROR_MESSAGE);
      }
    });

    it('rejects password without special character', () => {
      const parsed = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password12',
        name: 'Test',
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const messages = parsed.error.issues.map((issue) => issue.message);
        expect(messages).toContain(PASSWORD_ERROR_MESSAGE);
      }
    });

    it('rejects empty or whitespace-only name', () => {
      const parsed = registerSchema.safeParse({
        email: 'test@example.com',
        password: 'Password1!',
        name: '   ',
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const messages = parsed.error.issues.map((issue) => issue.message);
        expect(messages).toContain(NAME_ERROR_MESSAGE);
      }
    });
  });

  describe('loginSchema', () => {
    it('accepts valid email and password credentials', () => {
      const parsed = loginSchema.safeParse({
        email: '  test@example.com  ',
        password: '  Secret123!  ',
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.email).toBe('test@example.com');
        expect(parsed.data.password).toBe('Secret123!');
      }
    });

    it('accepts empty object for refresh token login', () => {
      const parsed = loginSchema.safeParse({});
      expect(parsed.success).toBe(true);
    });

    it('accepts undefined email and password fields for refresh token login', () => {
      const parsed = loginSchema.safeParse({
        email: undefined,
        password: undefined,
      });
      expect(parsed.success).toBe(true);
    });

    it('rejects invalid email in credentials login', () => {
      const parsed = loginSchema.safeParse({
        email: 'not-an-email',
        password: 'password',
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects empty password in credentials login', () => {
      const parsed = loginSchema.safeParse({
        email: 'test@example.com',
        password: '   ',
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe('tokenDataSchema', () => {
    it('accepts valid uuid and iso datetime', () => {
      const nowIso = new Date().toISOString();
      const parsed = tokenDataSchema.safeParse({
        user_id: VALID_UUID,
        expires_at: nowIso,
      });

      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.user_id).toBe(VALID_UUID);
        expect(parsed.data.expires_at).toBe(nowIso);
      }
    });

    it('rejects invalid uuid', () => {
      const parsed = tokenDataSchema.safeParse({
        user_id: 'not-a-uuid',
        expires_at: new Date().toISOString(),
      });
      expect(parsed.success).toBe(false);
    });

    it('rejects invalid iso datetime string', () => {
      const parsed = tokenDataSchema.safeParse({
        user_id: VALID_UUID,
        expires_at: 'invalid-date',
      });
      expect(parsed.success).toBe(false);
    });
  });
});
