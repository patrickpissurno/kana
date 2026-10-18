import type { ServerResponse } from '@kana/helpers/types';
import { loginSchema, registerSchema } from '@kana/helpers/auth/schemas';
import { parseFormData } from '@rvf/react-router';
import {
  attachDeviceIdCookie,
  attachSessionCookie,
  deleteSessionCookie,
  getDeviceIdCookie,
  getSessionCookie,
} from '~/helpers/auth/cookie.server';
import { login } from '~/helpers/auth/login.server';
import { register } from '~/helpers/auth/register.server';
import { defineRoutes } from '~/helpers/define-routes.server';
import { HTTP_CREATED, HTTP_OK } from '~/helpers/http-status.server';
import { makeError } from '~/helpers/make-error.server';

export const authRoutes = defineRoutes({
  '/auth/register': {
    POST: async (req) => {
      const form = await parseFormData(req, registerSchema);

      if (form.error) {
        return makeError(form);
      }

      const deviceId = getDeviceIdCookie(req) ?? form.data.device_id;
      const result = await register(form.data, deviceId);

      if (!result.data) {
        return makeError(result);
      }

      const res = Response.json(
        {
          data: {
            email: result.data.user.email,
            name: result.data.user.name,
            expires_at: result.data.expires_at,
            device_id: result.data.device_id,
          },
        } satisfies ServerResponse,
        { status: HTTP_CREATED }
      );

      attachSessionCookie(req, res, {
        token: result.data.token,
        user: {
          email: result.data.user.email,
          name: result.data.user.name,
          expires_at: result.data.expires_at,
          device_id: result.data.device_id,
        },
      });

      attachDeviceIdCookie(req, res, result.data.device_id);

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

      const deviceId = getDeviceIdCookie(req) ?? form.data.device_id;
      const result = await login({ data: form.data, refreshToken, deviceId });

      if (!result.data) {
        return makeError(result);
      }

      const res = Response.json(
        {
          data: {
            email: result.data.user.email,
            name: result.data.user.name,
            expires_at: result.data.expires_at,
            device_id: result.data.device_id,
          },
        } satisfies ServerResponse,
        { status: HTTP_CREATED }
      );

      attachSessionCookie(req, res, {
        token: result.data.token,
        user: {
          email: result.data.user.email,
          name: result.data.user.name,
          expires_at: result.data.expires_at,
          device_id: result.data.device_id,
        },
      });

      attachDeviceIdCookie(req, res, result.data.device_id);

      return res;
    },
  },
  '/auth/logout': {
    POST: async (req) => {
      const res = Response.json(
        {
          data: { success: true },
        } satisfies ServerResponse,
        { status: HTTP_OK }
      );

      deleteSessionCookie(req, res);

      await Promise.resolve();
      return res;
    },
  },
});
