import type { SyncQuizEventsPayload, SyncQuizEventsResponse } from '@kana/helpers/sync/schemas';
import { VITE_BACKEND_URL } from '~/helpers/config';
import { endpoint } from '~/helpers/endpoint';

export const syncQuizEvents = endpoint<SyncQuizEventsPayload, SyncQuizEventsResponse>(
  async ({ f, props }) => {
    const url = `${VITE_BACKEND_URL}/sync/quiz-events`;

    return f(url, {
      method: 'POST',
      body: JSON.stringify(props),
      headers: {
        'Content-Type': 'application/json',
      },
      mode: 'cors',
      credentials: 'include',
    });
  }
);
