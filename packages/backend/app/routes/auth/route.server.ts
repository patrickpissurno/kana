import { loginSchema, registerSchema } from '@kana/helpers/auth/schemas';
import { parseFormData } from '@rvf/react-router';
import { attachSessionCookie, getSessionCookie } from '~/helpers/auth/cookie.server';
import { login } from '~/helpers/auth/login.server';
import { register } from '~/helpers/auth/register.server';
import { defineRoutes } from '~/helpers/define-routes.server';
import { HTTP_CREATED } from '~/helpers/http-status.server';
import { makeError } from '~/helpers/make-error.server';

export const authRoutes = defineRoutes({
  '/auth/register': {
    POST: async (req) => {
      const form = await parseFormData(req, registerSchema);

      if (form.error) {
        return makeError(form);
      }

      const result = await register(form.data);

      if (!result.data) {
        return makeError(result);
      }

      const res = Response.json(
        {
          data: {
            email: result.data.user.email,
            name: result.data.user.name,
            expires_at: result.data.expires_at,
          },
        },
        { status: HTTP_CREATED }
      );

      attachSessionCookie(req, res, result.data.token);

      return res;
    },
  },
  '/auth/login': {
    POST: async (req) => {
      const form = await parseFormData(req, loginSchema);

      const refreshToken = getSessionCookie(req);

      if (form.error) {
        return makeError(form);
      }

      const result = await login({ data: form.data, refreshToken });

      if (!result.data) {
        return makeError(result);
      }

      const res = Response.json(
        {
          data: {
            email: result.data.user.email,
            name: result.data.user.name,
            expires_at: result.data.expires_at,
          },
        },
        { status: HTTP_CREATED }
      );

      attachSessionCookie(req, res, result.data.token);

      return res;
    },
  },
});
