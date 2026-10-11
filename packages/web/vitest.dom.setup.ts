import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { createInMemoryIndexedDB } from './app/mocks/in-memory-idb';

beforeEach(() => {
  const fakeIdb = createInMemoryIndexedDB();
  Object.defineProperty(window, 'indexedDB', {
    configurable: true,
    writable: true,
    value: fakeIdb,
  });
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    writable: true,
    value: fakeIdb,
  });
});

// Runs a cleanup after each test case (e.g., clearing the jsdom/happy-dom queries)
afterEach(() => {
  cleanup();
});
