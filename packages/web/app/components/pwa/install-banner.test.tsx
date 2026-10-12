import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isIos, isStandalone, usePwaInstall } from '../../helpers/use-pwa-install';
import {
  InstallBanner,
  isPermanentlyDismissed,
  PWA_INSTALL_DISMISSED_KEY,
  setPermanentlyDismissed,
} from './install-banner';

vi.mock('../../helpers/use-pwa-install', () => ({
  isIos: vi.fn(),
  isStandalone: vi.fn(),
  usePwaInstall: vi.fn(),
}));

describe('isPermanentlyDismissed and setPermanentlyDismissed', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns true when localStorage has dismissed key set to true', () => {
    localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, 'true');
    expect(isPermanentlyDismissed()).toBe(true);
  });

  it('returns false when localStorage has no key', () => {
    expect(isPermanentlyDismissed()).toBe(false);
  });

  it('returns false if localStorage.getItem throws', () => {
    const spy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(isPermanentlyDismissed()).toBe(false);
    spy.mockRestore();
  });

  it('sets dismissed key in localStorage', () => {
    setPermanentlyDismissed();
    expect(localStorage.getItem(PWA_INSTALL_DISMISSED_KEY)).toBe('true');
  });

  it('gracefully handles localStorage.setItem throwing', () => {
    const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => setPermanentlyDismissed()).not.toThrow();
    spy.mockRestore();
  });

  it('returns false when storage is null', () => {
    expect(isPermanentlyDismissed(null)).toBe(false);
  });

  it('noops when storage is null', () => {
    expect(() => setPermanentlyDismissed(null)).not.toThrow();
  });

  it('handles environment where localStorage is undefined', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(isPermanentlyDismissed()).toBe(false);
    expect(() => setPermanentlyDismissed()).not.toThrow();
    vi.unstubAllGlobals();
  });
});

describe('InstallBanner', () => {
  let installMock = vi.fn<() => Promise<void>>();

  beforeEach(() => {
    localStorage.clear();
    installMock = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    vi.mocked(isStandalone).mockReturnValue(false);
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders null if permanently dismissed', () => {
    localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, 'true');
    vi.mocked(isIos).mockReturnValue(false);
    vi.mocked(usePwaInstall).mockReturnValue({
      canInstall: true,
      install: installMock,
    });

    const { container } = render(<InstallBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders null if app is already running in standalone mode', () => {
    vi.mocked(isStandalone).mockReturnValue(true);
    vi.mocked(isIos).mockReturnValue(false);
    vi.mocked(usePwaInstall).mockReturnValue({
      canInstall: true,
      install: installMock,
    });

    const { container } = render(<InstallBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders iOS instructions on iOS devices and dismisses permanently on close', () => {
    vi.mocked(isIos).mockReturnValue(true);
    vi.mocked(usePwaInstall).mockReturnValue({
      canInstall: false,
      install: installMock,
    });

    render(<InstallBanner />);
    expect(screen.getByText(/To install, tap Share/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Share')).toBeInTheDocument();
    expect(screen.getByLabelText('Add to Home Screen')).toBeInTheDocument();

    const dismissButton = screen.getByLabelText('Dismiss install banner');
    fireEvent.click(dismissButton);

    expect(screen.queryByText(/To install, tap Share/i)).not.toBeInTheDocument();
    expect(localStorage.getItem(PWA_INSTALL_DISMISSED_KEY)).toBe('true');
  });

  it('renders null on non-iOS devices when canInstall is false', () => {
    vi.mocked(isIos).mockReturnValue(false);
    vi.mocked(usePwaInstall).mockReturnValue({
      canInstall: false,
      install: installMock,
    });

    const { container } = render(<InstallBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders install button on non-iOS devices when canInstall is true and handles install & dismiss', () => {
    vi.mocked(isIos).mockReturnValue(false);
    vi.mocked(usePwaInstall).mockReturnValue({
      canInstall: true,
      install: installMock,
    });

    render(<InstallBanner />);
    expect(screen.getByText('Install Kana for offline practice')).toBeInTheDocument();

    const installButton = screen.getByRole('button', { name: 'Install' });
    fireEvent.click(installButton);
    expect(installMock).toHaveBeenCalledTimes(1);

    const dismissButton = screen.getByLabelText('Dismiss install banner');
    fireEvent.click(dismissButton);

    expect(screen.queryByText('Install Kana for offline practice')).not.toBeInTheDocument();
    expect(localStorage.getItem(PWA_INSTALL_DISMISSED_KEY)).toBe('true');
  });

  it('handles rejected install call gracefully', () => {
    vi.mocked(isIos).mockReturnValue(false);
    installMock = vi.fn<() => Promise<void>>().mockRejectedValue(new Error('Install error'));
    vi.mocked(usePwaInstall).mockReturnValue({
      canInstall: true,
      install: installMock,
    });

    render(<InstallBanner />);
    const installButton = screen.getByRole('button', { name: 'Install' });
    fireEvent.click(installButton);
    expect(installMock).toHaveBeenCalledTimes(1);
  });
});
