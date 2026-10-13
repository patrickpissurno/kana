/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

const EXCLUDE = ['./app/mocks/**/*'];

export default defineConfig({
  plugins: [],
  resolve: {
    tsconfigPaths: true,
  },
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
      include: ['app/**/*.{ts,tsx}'],
      exclude: EXCLUDE,
    },
    projects: [
      {
        extends: true,
        test: {
          include: ['./app/**/*.test.{ts,tsx}'],
          exclude: [...EXCLUDE],
          name: 'node',
          environment: 'node',
        },
      },
    ],
  },
});
