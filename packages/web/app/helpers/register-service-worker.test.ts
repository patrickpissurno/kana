import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from './register-service-worker';

describe('registerServiceWorker', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('does nothing when serviceWorker is not supported in navigator', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true,
    });

    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    registerServiceWorker();
    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it('registers immediately when document.readyState is complete and updates on online event', async () => {
    const updateMock = vi
      .fn<() => Promise<ServiceWorkerRegistration>>()
      .mockResolvedValue({} as ServiceWorkerRegistration);
    const registerMock = vi.fn<() => Promise<ServiceWorkerRegistration>>().mockResolvedValue({
      update: updateMock,
    } as unknown as ServiceWorkerRegistration);

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        serviceWorker: {
          register: registerMock,
        },
      },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      configurable: true,
      writable: true,
    });

    registerServiceWorker();

    expect(registerMock).toHaveBeenCalledWith('/sw.js');
    await Promise.resolve();
    await Promise.resolve();

    window.dispatchEvent(new Event('online'));
    expect(updateMock).toHaveBeenCalled();
  });

  it('registers on window load event when document is still loading', async () => {
    const updateMock = vi
      .fn<() => Promise<ServiceWorkerRegistration>>()
      .mockRejectedValue(new Error('Update failed'));
    const registerMock = vi.fn<() => Promise<ServiceWorkerRegistration>>().mockResolvedValue({
      update: updateMock,
    } as unknown as ServiceWorkerRegistration);

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        serviceWorker: {
          register: registerMock,
        },
      },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      configurable: true,
      writable: true,
    });

    registerServiceWorker();

    expect(registerMock).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('load'));
    expect(registerMock).toHaveBeenCalledWith('/sw.js');

    await Promise.resolve();
    await Promise.resolve();

    window.dispatchEvent(new Event('online'));
    expect(updateMock).toHaveBeenCalled();
  });

  it('handles registration failure gracefully', async () => {
    const registerMock = vi
      .fn<() => Promise<ServiceWorkerRegistration>>()
      .mockRejectedValue(new Error('Registration failed'));

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        serviceWorker: {
          register: registerMock,
        },
      },
      configurable: true,
      writable: true,
    });

    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      configurable: true,
      writable: true,
    });

    registerServiceWorker();
    expect(registerMock).toHaveBeenCalledWith('/sw.js');
    await Promise.resolve();
  });
});
