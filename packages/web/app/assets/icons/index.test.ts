import { describe, expect, it } from 'vitest';
import { PWA_ICONS } from '.';

describe('icons index', () => {
  it('loads without throwing', () => {
    expect(Object.keys(PWA_ICONS).length).toBeGreaterThan(0);
  });
});
