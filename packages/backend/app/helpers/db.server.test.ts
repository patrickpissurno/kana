import type { SQL } from 'bun';
import { describe, expect, it, vi } from 'vitest';

const mockSqlInstance = {} as unknown as SQL;

vi.mock('bun', () => {
  function MockSQL() {
    return mockSqlInstance;
  }
  return {
    SQL: MockSQL,
  };
});

describe('db.server', () => {
  it('exports an instance of SQL', async () => {
    const { db } = await import('./db.server');
    expect(db).toBe(mockSqlInstance);
  });
});
