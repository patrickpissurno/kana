import { z } from 'zod';

const MIN_SECRET_LENGTH = 32;
const MIN_SECRET_SALT_LENGTH = 16;

/** one year */
export const SESSION_TTL_SECONDS = 31536000;

/** 24 hours */
export const CORS_MAX_AGE_SECONDS = 86400;

export const AES_GCM_IV_LENGTH = 12;

const hostSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9-.]*(:[0-9]+)?$/)
  .min(1);

const originSchema = z
  .string()
  .trim()
  .regex(/^(http|https):\/\/[a-zA-Z0-9][a-zA-Z0-9-.]*(:[0-9]+)?$/)
  .min(1);

export const schema = z.object({
  SESSION_SECRET: z.string().trim().min(MIN_SECRET_LENGTH),
  SESSION_SECRET_SALT: z.string().trim().min(MIN_SECRET_SALT_LENGTH),
  SESSION_COOKIE_DOMAIN: hostSchema,
  SESSION_COOKIE_NAME: z.string().trim().min(1),
  CORS_VALID_ORIGINS: z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
    )
    .pipe(z.array(originSchema).min(1)),
});

export const {
  SESSION_SECRET,
  SESSION_SECRET_SALT,
  SESSION_COOKIE_DOMAIN,
  SESSION_COOKIE_NAME,
  CORS_VALID_ORIGINS,
} = schema.parse(process.env);
