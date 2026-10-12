import { startTransition } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { HydratedRouter } from 'react-router/dom';
import { registerServiceWorker } from './helpers/register-service-worker';

startTransition(() => {
  hydrateRoot(document, <HydratedRouter />);
  registerServiceWorker();
});
