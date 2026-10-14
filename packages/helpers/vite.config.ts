/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  test: {
    coverage: {
      enabled: true,
      provider: 'istanbul',
      thresholds: {
        functions: 100,
        lines: 100,
        branches: 100,
        statements: 100,
        perFile: true,
      },
      include: ['src/**/*.{ts,tsx}'],
    },
    projects: [
      {
        extends: true,
        test: {
          include: ['./src/**/*.test.{ts,tsx}'],
          name: 'node',
          environment: 'node',
        },
      },
    ],
  },
});
