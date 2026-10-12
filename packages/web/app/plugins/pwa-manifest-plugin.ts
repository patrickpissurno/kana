import type { Plugin, Rollup } from 'vite';

export type PwaManifestIcon = {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
};

export type PwaManifest = {
  id: string;
  name: string;
  short_name: string;
  description: string;
  start_url: string;
  scope: string;
  display: string;
  orientation: string;
  background_color: string;
  theme_color: string;
  icons: PwaManifestIcon[];
};

const JSON_INDENT = 2;

export function pwaManifestPlugin(): Plugin {
  return {
    name: 'pwa-manifest-hashed-icons',
    generateBundle(this: Rollup.PluginContext, _, bundle: Rollup.OutputBundle) {
      const findAsset = (name: string, ext = '.png'): string => {
        const key = Object.keys(bundle).find(
          (k) => k.includes(name) && k.endsWith(ext) && !k.endsWith('.map')
        );
        return key ? `/${key}` : `/assets/${name}${ext}`;
      };

      const manifest: PwaManifest = {
        id: '/',
        name: 'Kana - Learn Japanese',
        short_name: 'Kana',
        description: 'Master Japanese Hiragana with spaced repetition.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#141414',
        theme_color: '#141414',
        icons: [
          {
            src: findAsset('icon-192'),
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: findAsset('icon-512'),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: findAsset('icon-maskable-192'),
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: findAsset('icon-maskable-512'),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: findAsset('icon', '.svg'),
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      };

      this.emitFile({
        type: 'asset',
        fileName: 'manifest.webmanifest',
        source: `${JSON.stringify(manifest, null, JSON_INDENT)}\n`,
      });
    },
  };
}
