import { syncQuizEventsSchema } from '@kana/helpers/sync/schemas';
import { enforceAuthentication } from '~/helpers/auth/enforce-authentication.server';
import { defineRoutes } from '~/helpers/define-routes.server';
import { HTTP_OK } from '~/helpers/http-status.server';
import { makeError } from '~/helpers/make-error.server';
import { parseJSONData } from '~/helpers/parse-json-data.server';
import { syncQuizEvents } from '~/helpers/sync/quiz-events.server';

export const syncRoutes = defineRoutes({
  '/sync/quiz-events': {
    POST: async (req) => {
      const { user_id, device_id } = await enforceAuthentication(req);

      const form = await parseJSONData(req, syncQuizEventsSchema);

      if (form.error) {
        return makeError(form);
      }

      const result = await syncQuizEvents({
        data: form.data,
        user_id,
        device_id,
      });

      if (!result.rawJson) {
        return makeError(result);
      }

      return new Response(result.rawJson, {
        status: HTTP_OK,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
  },
});
