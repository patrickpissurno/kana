/// <reference types="vitest/config" />
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const EXCLUDE = [
  './app/root.tsx',
  './app/entry.server.tsx',
  './app/entry.client.tsx',
  './app/routes.ts',
  './app/mocks/**/*',
  './app/plugins/**/*',
];

const ENV = process.env as Record<string, string>;

export default defineConfig({
  plugins: [tailwindcss(), ...(ENV['VITEST'] ? [] : [reactRouter()])],
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
      exclude: EXCLUDE,
    },
    projects: [
      {
        extends: true,
        test: {
          include: ['./app/**/*.test.{ts,tsx}'],
          exclude: [...EXCLUDE, './app/**/*.server.{ts,tsx,test.ts,test.tsx}'],
          name: 'happy-dom',
          environment: 'happy-dom',
          setupFiles: './vitest.dom.setup.ts',
        },
      },
      {
        extends: true,
        test: {
          include: ['./app/**/*.server.test.{ts,tsx}'],
          exclude: [...EXCLUDE],
          name: 'node',
          environment: 'node',
        },
      },
    ],
  },
});
