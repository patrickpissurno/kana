import { SQL } from 'bun';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(import.meta.dirname, '../migrations');
const ADVISORY_LOCK_ID = 81726354;
const SINGLE_CONNECTION_POOL_SIZE = 1;
const DECIMAL_RADIX = 10;
const REGEX_ID_INDEX = 1;
const REGEX_CONCURRENT_INDEX = 2;
const SCRIPT_ARGV_INDEX = 1;
const EMPTY_COUNT = 0;

const ERR_UNDEFINED_TABLE = '42P01';
const ERR_INVALID_SCHEMA_NAME = '3F000';

type ExecutedMigration = {
  readonly filename: string;
  readonly id: number;
  readonly isConcurrent: boolean;
  readonly content: undefined;
  readonly hash: string;
  readonly isExecuted: true;
};

type PendingMigration = {
  readonly filename: string;
  readonly id: number;
  readonly isConcurrent: boolean;
  readonly content: string;
  readonly hash: string;
  readonly isExecuted: false;
};

type LocalMigration = ExecutedMigration | PendingMigration;

async function executeMigration(sql: SQL, migration: PendingMigration): Promise<void> {
  const { filename, id, isConcurrent, hash, content } = migration;

  console.log(`Running migration: ${filename}`);

  if (isConcurrent) {
    console.log(' -> Running CONCURRENTLY (No Transaction)');
    await sql.unsafe(content);
    await sql`INSERT INTO db_migrations.history (id, name, hash) VALUES (${id}, ${filename}, ${hash})`;
  } else {
    try {
      await sql.begin(async (tx) => {
        await tx.unsafe(content);
        await tx`INSERT INTO db_migrations.history (id, name, hash) VALUES (${id}, ${filename}, ${hash})`;
      });
    } catch (error) {
      console.error(`\n>>> FAILED MIGRATION: ${filename} <<<\n`);
      throw error;
    }
  }
}

export async function runMigrations(sql: SQL): Promise<void> {
  console.log('Acquiring migration lock...');
  await sql`SELECT pg_advisory_lock(${ADVISORY_LOCK_ID})`;

  try {
    const executedMigrations = new Map<number, string>();

    // 1. Fetch all executed migrations
    try {
      const rows = await sql<
        { id: number; hash: string }[]
      >`SELECT id, hash FROM db_migrations.history`;
      for (const row of rows) {
        executedMigrations.set(row.id, row.hash);
      }
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'errno' in error &&
        (error.errno === ERR_UNDEFINED_TABLE || error.errno === ERR_INVALID_SCHEMA_NAME)
      ) {
        console.log('Migration history table not found. Assuming fresh database.');
      } else {
        throw error;
      }
    }

    const rawFiles = await readdir(MIGRATIONS_DIR);

    // 2. Read, validate, hash, and map local migrations
    const allLocalMigrations: LocalMigration[] = (
      await Promise.all(
        rawFiles.map(async (filename) => {
          const match = /^(\d+)(?:\.(concurrent))?\.sql$/.exec(filename);

          if (match?.[REGEX_ID_INDEX] == null) {
            throw new Error(
              `CRITICAL: Unknown file pattern detected in migrations folder: ${filename}`
            );
          }

          const id = parseInt(match[REGEX_ID_INDEX], DECIMAL_RADIX);
          const isConcurrent = match[REGEX_CONCURRENT_INDEX] === 'concurrent';
          const content = await readFile(join(MIGRATIONS_DIR, filename), 'utf-8');

          if (/\b(BEGIN|COMMIT|ROLLBACK)\b/i.test(content)) {
            throw new Error(
              `CRITICAL: Transaction keywords found in ${filename}. The runner owns the transaction.`
            );
          }

          if (isConcurrent) {
            const cleanSql = content.replace(/--.*$/gm, '').trim();
            // Requirement 1: Enforce IF NOT EXISTS for concurrent indices
            if (!/^CREATE\s+INDEX\s+CONCURRENTLY\s+IF\s+NOT\s+EXISTS/i.test(cleanSql)) {
              throw new Error(
                `CRITICAL: Migration ${filename} is marked concurrent but must start with CREATE INDEX CONCURRENTLY IF NOT EXISTS.`
              );
            }
          }

          const hash = createHash('sha256').update(content).digest('hex');
          const isExecuted = executedMigrations.has(id);

          // Validate integrity of already executed migrations immediately
          if (isExecuted && executedMigrations.get(id) !== hash) {
            throw new Error(
              `CRITICAL: The executed migration (${filename}) has been modified since it was run!`
            );
          }

          // Return metadata; drop content from RAM if it's already executed
          return isExecuted
            ? {
                filename,
                id,
                isConcurrent,
                content: undefined,
                hash,
                isExecuted,
              }
            : {
                filename,
                id,
                isConcurrent,
                content,
                hash,
                isExecuted,
              };
        })
      )
    ).sort((a, b) => a.id - b.id);

    // 3. Requirement 2: Validate there are no gaps in local files
    for (const [index, migration] of allLocalMigrations.entries()) {
      // Aligning with standard SQL starting at 1
      const expectedId = index + 1;
      if (migration.id !== expectedId) {
        throw new Error(
          `CRITICAL: Migration gap detected. Expected migration ID ${expectedId.toString()}, but found ${migration.filename}.`
        );
      }
    }

    // 4. Requirement 3: Validate upstream database doesn't have missing local files
    // Since local files are strictly 1..N, any executed ID > local total is a missing file.
    for (const executedId of executedMigrations.keys()) {
      if (executedId > allLocalMigrations.length) {
        throw new Error(
          `CRITICAL: Migration ID ${executedId.toString()} has been run in the database but is missing from your local files!`
        );
      }
    }

    // 5. Filter down to only what needs to be run
    const pendingMigrations = allLocalMigrations.filter(
      (migration): migration is PendingMigration => !migration.isExecuted
    );

    if (pendingMigrations.length === EMPTY_COUNT) {
      console.log('Database is up to date.');
      return;
    }

    // 6. Execute only pending migrations sequentially
    await pendingMigrations.reduce(async (previousPromise, migration) => {
      await previousPromise;
      await executeMigration(sql, migration);
    }, Promise.resolve());

    console.log('All migrations applied successfully.');
  } finally {
    console.log('Releasing migration lock...');
    try {
      await sql`SELECT pg_advisory_unlock(${ADVISORY_LOCK_ID})`;
    } finally {
      await sql.close();
    }
  }
}

// Automatically run if executed directly (e.g., `bun run migrate`)
const scriptPath = process.argv.at(SCRIPT_ARGV_INDEX);
if (scriptPath && import.meta.url.startsWith(`file://${scriptPath}`)) {
  const cliSql = new SQL({ max: SINGLE_CONNECTION_POOL_SIZE });
  await runMigrations(cliSql);
}
