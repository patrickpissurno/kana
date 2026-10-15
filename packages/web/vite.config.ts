/// <reference types="vitest/config" />
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaManifestPlugin } from './app/plugins/pwa-manifest-plugin.ts';

const EXCLUDE = [
  './app/root.tsx',
  './app/entry.server.tsx',
  './app/entry.client.tsx',
  './app/routes.ts',
  './app/mocks/**/*',
];

const ENV = process.env as Record<string, string>;

export default defineConfig({
  build: {
    assetsInlineLimit: (filePath) => {
      if (filePath.includes('assets/icons/')) {
        return false;
      }
      return undefined;
    },
  },
  plugins: [
    tailwindcss(),
    ...(ENV['VITEST']
      ? []
      : [
          reactRouter(),
          pwaManifestPlugin(),
          VitePWA({
            outDir: 'build/client',
            registerType: 'autoUpdate',
            injectRegister: false,
            manifest: false,
            workbox: {
              globDirectory: 'build/client',
              globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,woff2}'],
              navigateFallback: null,
              cleanupOutdatedCaches: true,
              runtimeCaching: [
                {
                  urlPattern: ({ request }) => request.mode === 'navigate',
                  handler: 'NetworkFirst',
                  options: {
                    cacheName: 'pages-cache',
                    networkTimeoutSeconds: 3,
                  },
                },
              ],
            },
          }),
        ]),
  ],
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@rvf/react-router': '@rvf/react-router/dist/index.esm.js',
    },
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
