import type { Rollup } from 'vite';
import { describe, expect, it, vi } from 'vitest';
import type { PwaManifest } from './pwa-manifest-plugin';
import { pwaManifestPlugin } from './pwa-manifest-plugin';

const ICON_COUNT = 5;
const INDEX_FIRST = 0;
const INDEX_SECOND = 1;
const INDEX_THIRD = 2;
const INDEX_FOURTH = 3;
const INDEX_FIFTH = 4;

function createMockAsset(fileName: string): Rollup.OutputAsset {
  return {
    type: 'asset',
    fileName,
    name: fileName,
    source: '',
  } as unknown as Rollup.OutputAsset;
}

describe('pwaManifestPlugin', () => {
  it('registers with the correct plugin name', () => {
    const plugin = pwaManifestPlugin();
    expect(plugin.name).toBe('pwa-manifest-hashed-icons');
  });

  it('emits manifest with resolved hashed assets from bundle', async () => {
    const plugin = pwaManifestPlugin();
    const emitFileMock = vi.fn<Rollup.PluginContext['emitFile']>();

    const mockContext = {
      emitFile: emitFileMock,
    } as unknown as Rollup.PluginContext;

    const bundle: Rollup.OutputBundle = {
      'assets/icon-192.png.map': createMockAsset('assets/icon-192.png.map'),
      'assets/icon-192-ABC123.png': createMockAsset('assets/icon-192-ABC123.png'),
      'assets/icon-512-DEF456.png': createMockAsset('assets/icon-512-DEF456.png'),
      'assets/icon-maskable-192-GHI789.png': createMockAsset('assets/icon-maskable-192-GHI789.png'),
      'assets/icon-maskable-512-JKL012.png': createMockAsset('assets/icon-maskable-512-JKL012.png'),
      'assets/icon-MNO345.svg': createMockAsset('assets/icon-MNO345.svg'),
    };

    if (typeof plugin.generateBundle === 'function' && 'call' in plugin.generateBundle) {
      await plugin.generateBundle.call(mockContext, {} as never, bundle, false);
    }

    expect(emitFileMock).toHaveBeenCalledTimes(1);
    const emitted = emitFileMock.mock.calls[INDEX_FIRST]?.[INDEX_FIRST];
    expect(emitted?.type).toBe('asset');
    expect(emitted?.fileName).toBe('manifest.webmanifest');

    const manifest = JSON.parse((emitted as Rollup.OutputAsset).source as string) as PwaManifest;
    expect(manifest.name).toBe('Kana - Learn Japanese');
    expect(manifest.short_name).toBe('Kana');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#141414');
    expect(manifest.icons).toHaveLength(ICON_COUNT);
    expect(manifest.icons[INDEX_FIRST]?.src).toBe('/assets/icon-192-ABC123.png');
    expect(manifest.icons[INDEX_SECOND]?.src).toBe('/assets/icon-512-DEF456.png');
    expect(manifest.icons[INDEX_THIRD]?.src).toBe('/assets/icon-maskable-192-GHI789.png');
    expect(manifest.icons[INDEX_FOURTH]?.src).toBe('/assets/icon-maskable-512-JKL012.png');
    expect(manifest.icons[INDEX_FIFTH]?.src).toBe('/assets/icon-MNO345.svg');
  });

  it('uses fallback paths when assets are not found in bundle', async () => {
    const plugin = pwaManifestPlugin();
    const emitFileMock = vi.fn<Rollup.PluginContext['emitFile']>();

    const mockContext = {
      emitFile: emitFileMock,
    } as unknown as Rollup.PluginContext;

    const bundle: Rollup.OutputBundle = {};

    if (typeof plugin.generateBundle === 'function' && 'call' in plugin.generateBundle) {
      await plugin.generateBundle.call(mockContext, {} as never, bundle, false);
    }

    expect(emitFileMock).toHaveBeenCalledTimes(1);
    const emitted = emitFileMock.mock.calls[INDEX_FIRST]?.[INDEX_FIRST];
    const manifest = JSON.parse((emitted as Rollup.OutputAsset).source as string) as PwaManifest;

    expect(manifest.icons[INDEX_FIRST]?.src).toBe('/assets/icon-192.png');
    expect(manifest.icons[INDEX_SECOND]?.src).toBe('/assets/icon-512.png');
    expect(manifest.icons[INDEX_THIRD]?.src).toBe('/assets/icon-maskable-192.png');
    expect(manifest.icons[INDEX_FOURTH]?.src).toBe('/assets/icon-maskable-512.png');
    expect(manifest.icons[INDEX_FIFTH]?.src).toBe('/assets/icon.svg');
  });

  it('falls back to base icons when maskable icons are deduplicated in bundle', async () => {
    const plugin = pwaManifestPlugin();
    const emitFileMock = vi.fn<Rollup.PluginContext['emitFile']>();

    const mockContext = {
      emitFile: emitFileMock,
    } as unknown as Rollup.PluginContext;

    const bundle: Rollup.OutputBundle = {
      'assets/icon-192-ABC123.png': createMockAsset('assets/icon-192-ABC123.png'),
      'assets/icon-512-DEF456.png': createMockAsset('assets/icon-512-DEF456.png'),
      'assets/icon-MNO345.svg': createMockAsset('assets/icon-MNO345.svg'),
    };

    if (typeof plugin.generateBundle === 'function' && 'call' in plugin.generateBundle) {
      await plugin.generateBundle.call(mockContext, {} as never, bundle, false);
    }

    expect(emitFileMock).toHaveBeenCalledTimes(1);
    const emitted = emitFileMock.mock.calls[INDEX_FIRST]?.[INDEX_FIRST];
    const manifest = JSON.parse((emitted as Rollup.OutputAsset).source as string) as PwaManifest;

    expect(manifest.icons[INDEX_FIRST]?.src).toBe('/assets/icon-192-ABC123.png');
    expect(manifest.icons[INDEX_SECOND]?.src).toBe('/assets/icon-512-DEF456.png');
    expect(manifest.icons[INDEX_THIRD]?.src).toBe('/assets/icon-192-ABC123.png');
    expect(manifest.icons[INDEX_FOURTH]?.src).toBe('/assets/icon-512-DEF456.png');
    expect(manifest.icons[INDEX_FIFTH]?.src).toBe('/assets/icon-MNO345.svg');
  });
});
