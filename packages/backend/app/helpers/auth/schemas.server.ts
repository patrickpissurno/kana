import { z } from 'zod';

export const PASSWORD_ERROR_MESSAGE =
  'Password must be at least 8 characters with lowercase, uppercase, number, and special character';
export const NAME_ERROR_MESSAGE = 'Please enter a name or nickname';
export const EMAIL_ERROR_MESSAGE = 'Please enter a valid email address';
export const PASSWORD_EMPTY_ERROR_MESSAGE = 'Please enter a password';
export const INVALID_EMAIL_OR_PASSWORD_MESSAGE = 'Invalid email or password';

const MIN_PASSWORD_LENGTH = 8;
const MIN_NAME_LENGTH = 1;

const REGEX_LOWERCASE = /[a-z]/;
const REGEX_UPPERCASE = /[A-Z]/;
const REGEX_NUMBER = /[0-9]/;
const REGEX_SPECIAL = /[^a-zA-Z0-9]/;

export const registerSchema = z.object({
  email: z.string(EMAIL_ERROR_MESSAGE).trim().pipe(z.email(EMAIL_ERROR_MESSAGE)),
  password: z
    .string(PASSWORD_ERROR_MESSAGE)
    .trim()
    .min(MIN_PASSWORD_LENGTH, PASSWORD_ERROR_MESSAGE)
    .regex(REGEX_LOWERCASE, PASSWORD_ERROR_MESSAGE)
    .regex(REGEX_UPPERCASE, PASSWORD_ERROR_MESSAGE)
    .regex(REGEX_NUMBER, PASSWORD_ERROR_MESSAGE)
    .regex(REGEX_SPECIAL, PASSWORD_ERROR_MESSAGE),
  name: z.string(NAME_ERROR_MESSAGE).trim().min(MIN_NAME_LENGTH, NAME_ERROR_MESSAGE),
});

export const loginSchema = z
  .object({
    email: z.string(EMAIL_ERROR_MESSAGE).trim().pipe(z.email(EMAIL_ERROR_MESSAGE)),
    password: z.string(PASSWORD_EMPTY_ERROR_MESSAGE).trim().min(1, PASSWORD_EMPTY_ERROR_MESSAGE),
  })
  .or(
    z.object({
      email: z.undefined().optional(),
      password: z.undefined().optional(),
    })
  );

export const tokenDataSchema = z.object({
  user_id: z.uuid(),
  expires_at: z.iso.datetime(),
});

export type RegisterPayload = z.infer<typeof registerSchema>;
export type LoginPayload = z.infer<typeof loginSchema>;
export type TokenData = z.infer<typeof tokenDataSchema>;
