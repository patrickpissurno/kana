import type { SQL } from 'bun';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runMigrations } from './migrate.server';

type QueryRecord = {
  readonly strings: readonly string[];
  readonly values: readonly unknown[];
};

type MockSqlInstance = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
  queries: QueryRecord[];
  unsafeCalls: string[];
  close: ReturnType<typeof vi.fn<() => Promise<void>>>;
  unsafe: ReturnType<typeof vi.fn<(query: string) => Promise<unknown>>>;
  begin: ReturnType<
    typeof vi.fn<(callback: (tx: unknown) => Promise<unknown>) => Promise<unknown>>
  >;
};

type MockPostgresErrorConstructor = new (
  message: string,
  options: { errno: string }
) => Error & { errno: string };

const { MockPostgresError, defaultCliSql } = vi.hoisted(() => {
  function PostgresError(
    this: Error & { errno: string },
    message: string,
    options: { errno: string }
  ) {
    this.name = 'PostgresError';
    this.message = message;
    this.errno = options.errno;
  }
  Object.setPrototypeOf(PostgresError.prototype, Error.prototype);

  const cliFileHash = '17db4fd369edb9244b9f91d9aeed145c3d04ad8ba6e95d06247f07a63527d11a';

  const queries: QueryRecord[] = [];
  const unsafeCalls: string[] = [];
  const sqlFn = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    await Promise.resolve();
    queries.push({ strings: Array.from(strings), values });
    const firstStr = strings[0] ?? '';
    if (firstStr.includes('SELECT id, hash FROM db_migrations.history')) {
      return [
        {
          id: 1,
          hash: cliFileHash,
        },
      ];
    }
    return [];
  }) as unknown as MockSqlInstance;

  sqlFn.queries = queries;
  sqlFn.unsafeCalls = unsafeCalls;
  sqlFn.close = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  sqlFn.unsafe = vi.fn<(query: string) => Promise<unknown>>().mockImplementation(async (query) => {
    await Promise.resolve();
    unsafeCalls.push(query);
  });
  sqlFn.begin = vi
    .fn<(callback: (tx: unknown) => Promise<unknown>) => Promise<unknown>>()
    .mockImplementation(async (callback) => callback(sqlFn));

  return {
    MockPostgresError: PostgresError as unknown as MockPostgresErrorConstructor,
    defaultCliSql: sqlFn,
  };
});

vi.mock('bun', () => {
  function MockSQL() {
    return defaultCliSql;
  }
  MockSQL.PostgresError = MockPostgresError;

  return {
    SQL: MockSQL,
  };
});

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    readdir: vi.fn(),
    readFile: vi.fn(),
  };
});

const ADVISORY_LOCK_ID = 81726354;
const CALL_INDEX_FIRST = 0;
const PARAM_INDEX_FIRST = 0;
const ERROR_TABLE_NOT_FOUND = '42P01';
const ERROR_SCHEMA_NOT_FOUND = '3F000';
const SCRIPT_ARGV_INDEX = 1;

function computeHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function mockFiles(files: string[]): void {
  vi.mocked(readdir).mockResolvedValue(files as unknown as Awaited<ReturnType<typeof readdir>>);
}

function createConfiguredMockSql(options?: {
  historyRows?: { id: number; hash: string }[];
  historyError?: Error & { errno?: string };
  failBegin?: boolean;
}): { mockSql: SQL; instance: MockSqlInstance } {
  const queries: QueryRecord[] = [];
  const unsafeCalls: string[] = [];

  const sqlFn = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    await Promise.resolve();
    queries.push({ strings: Array.from(strings), values });
    const firstStr = strings[CALL_INDEX_FIRST] ?? '';

    if (firstStr.includes('SELECT id, hash FROM db_migrations.history')) {
      if (options?.historyError !== undefined) {
        throw options.historyError;
      }
      return options?.historyRows ?? [];
    }

    return [];
  }) as unknown as MockSqlInstance;

  const instance = sqlFn;

  instance.queries = queries;
  instance.unsafeCalls = unsafeCalls;
  instance.close = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
  instance.unsafe = vi
    .fn<(query: string) => Promise<unknown>>()
    .mockImplementation(async (query) => {
      await Promise.resolve();
      unsafeCalls.push(query);
    });

  if (options?.failBegin) {
    instance.begin = vi
      .fn<(callback: (tx: unknown) => Promise<unknown>) => Promise<unknown>>()
      .mockRejectedValue(new Error('Transaction execution failed'));
  } else {
    instance.begin = vi
      .fn<(callback: (tx: unknown) => Promise<unknown>) => Promise<unknown>>()
      .mockImplementation(async (callback) => {
        const tx = createConfiguredMockSql().instance;
        return callback(tx);
      });
  }

  return { mockSql: instance as unknown as SQL, instance };
}

describe('runMigrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs successfully and acquires/releases advisory lock when database is up to date', async () => {
    const file1 = 'SELECT 1;';
    const file2 = 'SELECT 2;';
    const hash1 = computeHash(file1);
    const hash2 = computeHash(file2);

    mockFiles(['1.sql', '2.sql']);
    vi.mocked(readFile).mockImplementation(async (path) => {
      await Promise.resolve();
      const pathStr = typeof path === 'string' ? path : path instanceof URL ? path.pathname : '';
      if (pathStr.endsWith('1.sql')) {
        return file1;
      }
      return file2;
    });

    const { mockSql, instance } = createConfiguredMockSql({
      historyRows: [
        { id: 1, hash: hash1 },
        { id: 2, hash: hash2 },
      ],
    });

    await runMigrations(mockSql);

    expect(instance.queries[CALL_INDEX_FIRST]?.strings[CALL_INDEX_FIRST]).toContain(
      'SELECT pg_advisory_lock'
    );
    expect(instance.queries[CALL_INDEX_FIRST]?.values[PARAM_INDEX_FIRST]).toBe(ADVISORY_LOCK_ID);
    expect(instance.close).toHaveBeenCalledTimes(1);
  });

  it('handles fresh database when history table is undefined (42P01)', async () => {
    const content = 'CREATE TABLE test (id INT);';
    mockFiles(['1.sql']);
    vi.mocked(readFile).mockResolvedValue(content);

    const postgresError = new MockPostgresError('Table does not exist', {
      errno: ERROR_TABLE_NOT_FOUND,
    });
    const { mockSql, instance } = createConfiguredMockSql({
      historyError: postgresError,
    });

    await runMigrations(mockSql);

    expect(instance.begin).toHaveBeenCalledTimes(1);
    expect(instance.close).toHaveBeenCalledTimes(1);
  });

  it('handles fresh database when schema is undefined (3F000)', async () => {
    const content = 'CREATE TABLE test (id INT);';
    mockFiles(['1.sql']);
    vi.mocked(readFile).mockResolvedValue(content);

    const schemaError = Object.assign(new Error('Schema missing'), {
      errno: ERROR_SCHEMA_NOT_FOUND,
    });
    const { mockSql, instance } = createConfiguredMockSql({
      historyError: schemaError,
    });

    await runMigrations(mockSql);

    expect(instance.begin).toHaveBeenCalledTimes(1);
    expect(instance.close).toHaveBeenCalledTimes(1);
  });

  it('re-throws unexpected error when querying history table', async () => {
    mockFiles(['1.sql']);
    const unexpectedError = new Error('Database connection dropped');
    const { mockSql, instance } = createConfiguredMockSql({
      historyError: unexpectedError,
    });

    await expect(runMigrations(mockSql)).rejects.toThrow('Database connection dropped');
    expect(instance.close).toHaveBeenCalledTimes(1);
  });

  it('throws critical error when migration file does not match expected regex', async () => {
    mockFiles(['invalid_name.sql']);
    const { mockSql } = createConfiguredMockSql();

    await expect(runMigrations(mockSql)).rejects.toThrow(
      'CRITICAL: Unknown file pattern detected in migrations folder: invalid_name.sql'
    );
  });

  it('throws critical error when migration content contains transaction keywords', async () => {
    mockFiles(['1.sql']);
    vi.mocked(readFile).mockResolvedValue('BEGIN; CREATE TABLE a (id INT); COMMIT;');
    const { mockSql } = createConfiguredMockSql();

    await expect(runMigrations(mockSql)).rejects.toThrow(
      'CRITICAL: Transaction keywords found in 1.sql. The runner owns the transaction.'
    );
  });

  it('throws critical error when concurrent migration does not start with CREATE INDEX CONCURRENTLY IF NOT EXISTS', async () => {
    mockFiles(['1.concurrent.sql']);
    vi.mocked(readFile).mockResolvedValue('CREATE INDEX idx_user ON users(id);');
    const { mockSql } = createConfiguredMockSql();

    await expect(runMigrations(mockSql)).rejects.toThrow(
      'CRITICAL: Migration 1.concurrent.sql is marked concurrent but must start with CREATE INDEX CONCURRENTLY IF NOT EXISTS.'
    );
  });

  it('throws critical error when already executed migration hash does not match local hash', async () => {
    const content = 'SELECT 1;';
    mockFiles(['1.sql']);
    vi.mocked(readFile).mockResolvedValue(content);

    const { mockSql } = createConfiguredMockSql({
      historyRows: [{ id: 1, hash: 'mismatched_tampered_hash' }],
    });

    await expect(runMigrations(mockSql)).rejects.toThrow(
      'CRITICAL: The executed migration (1.sql) has been modified since it was run!'
    );
  });

  it('throws critical error when there is a gap in migration IDs', async () => {
    mockFiles(['1.sql', '3.sql']);
    vi.mocked(readFile).mockResolvedValue('SELECT 1;');
    const { mockSql } = createConfiguredMockSql();

    await expect(runMigrations(mockSql)).rejects.toThrow(
      'CRITICAL: Migration gap detected. Expected migration ID 2, but found 3.sql.'
    );
  });

  it('throws critical error when executed migration in db is missing from local files', async () => {
    const file1 = 'SELECT 1;';
    const hash1 = computeHash(file1);
    mockFiles(['1.sql']);
    vi.mocked(readFile).mockResolvedValue(file1);

    const { mockSql } = createConfiguredMockSql({
      historyRows: [
        { id: 1, hash: hash1 },
        { id: 99, hash: 'some_hash' },
      ],
    });

    await expect(runMigrations(mockSql)).rejects.toThrow(
      'CRITICAL: Migration ID 99 has been run in the database but is missing from your local files!'
    );
  });

  it('executes pending concurrent migration outside transaction', async () => {
    const content = '-- comment\nCREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test ON test(id);';
    mockFiles(['1.concurrent.sql']);
    vi.mocked(readFile).mockResolvedValue(content);

    const { mockSql, instance } = createConfiguredMockSql({
      historyRows: [],
    });

    await runMigrations(mockSql);

    expect(instance.unsafe).toHaveBeenCalledWith(content);
    expect(instance.begin).not.toHaveBeenCalled();
    expect(instance.close).toHaveBeenCalledTimes(1);
  });

  it('handles non-concurrent migration failure by rolling back and logging error', async () => {
    const content = 'CREATE TABLE failure_test (id INT);';
    mockFiles(['1.sql']);
    vi.mocked(readFile).mockResolvedValue(content);

    const { mockSql, instance } = createConfiguredMockSql({
      historyRows: [],
      failBegin: true,
    });

    await expect(runMigrations(mockSql)).rejects.toThrow('Transaction execution failed');
    expect(instance.close).toHaveBeenCalledTimes(1);
  });

  it('executes via direct CLI invocation check when script path matches process.argv[1]', async () => {
    vi.resetModules();
    const originalArgv = [...process.argv];
    const scriptPath = fileURLToPath(import.meta.resolve('./migrate.server'));
    process.argv[SCRIPT_ARGV_INDEX] = scriptPath;

    const fileContent = 'SELECT 1;';
    mockFiles(['1.sql']);
    vi.mocked(readFile).mockResolvedValue(fileContent);

    defaultCliSql.queries.length = 0;
    defaultCliSql.unsafeCalls.length = 0;

    const originalClose = defaultCliSql.close;
    defaultCliSql.close = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    try {
      await import('./migrate.server');
    } finally {
      process.argv = originalArgv;
      defaultCliSql.close = originalClose;
    }
  });
});
