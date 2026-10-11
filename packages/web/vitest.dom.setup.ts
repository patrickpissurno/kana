import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Runs a cleanup after each test case (e.g., clearing the jsdom/happy-dom queries)
afterEach(() => {
  cleanup();
});
