import { copyFileSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

import Sqlite from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "./schema";

const MIGRATIONS_FOLDER = "drizzle";

export type AppDatabase = BetterSQLite3Database<typeof schema>;

export interface DatabaseHandle {
  readonly db: AppDatabase;
  readonly withTransaction: <T>(work: () => Promise<T>) => Promise<T>;
  readonly close: () => void;
}

const hasTables = (connection: Sqlite.Database): boolean =>
  connection.prepare("select 1 from sqlite_master where type = 'table' limit 1").get() !== undefined;

// better-sqlite3 transactions are synchronous and cannot await, so the
// statements are issued explicitly. A single connection can only hold one
// transaction, so callers are queued instead of overlapping.
function createTransactionRunner(connection: Sqlite.Database) {
  let pending: Promise<unknown> = Promise.resolve();

  return <T>(work: () => Promise<T>): Promise<T> => {
    const run = async (): Promise<T> => {
      connection.exec("BEGIN");
      try {
        const result = await work();
        connection.exec("COMMIT");
        return result;
      } catch (error) {
        connection.exec("ROLLBACK");
        throw error;
      }
    };

    const result = pending.then(run, run);
    pending = result.then(
      () => undefined,
      () => undefined,
    );

    return result;
  };
}

// A migration that rebuilds a table others point at has to run with foreign
// keys off, and SQLite ignores that pragma inside a transaction, which is how
// the migrator runs. So it is switched off around the whole run, and every
// reference is checked before it is switched back on. The check can only run
// once the migrator has committed, which is why the caller keeps a copy.
export function migrateDatabase(connection: Sqlite.Database, db: AppDatabase, migrationsFolder: string): void {
  connection.pragma("foreign_keys = OFF");
  try {
    migrate(db, { migrationsFolder });
    const broken = connection.pragma("foreign_key_check") as unknown[];
    if (broken.length > 0) {
      throw new Error("A migration left references to rows that do not exist");
    }
  } finally {
    connection.pragma("foreign_keys = ON");
  }
}

function pendingMigrations(connection: Sqlite.Database, migrationsFolder: string): number {
  const journal = JSON.parse(readFileSync(join(migrationsFolder, "meta", "_journal.json"), "utf8")) as { entries: unknown[] };
  const applied = connection.prepare("select name from sqlite_master where type = 'table' and name = '__drizzle_migrations'").get()
    ? (connection.prepare("select count(*) as n from __drizzle_migrations").get() as { n: number }).n
    : 0;
  return journal.entries.length - applied;
}

function restore(filePath: string, copy: string): void {
  for (const suffix of ["-wal", "-shm"]) rmSync(filePath + suffix, { force: true });
  copyFileSync(copy, filePath);
  rmSync(copy, { force: true });
}

export interface OpenOptions {
  // An existing company is opened only if its file is there; only creating one makes a file.
  readonly create?: boolean;
  readonly migrationsFolder?: string;
}

export function openDatabase(
  filePath: string,
  { create = true, migrationsFolder = join(process.cwd(), MIGRATIONS_FOLDER) }: OpenOptions = {},
): DatabaseHandle {
  mkdirSync(dirname(filePath), { recursive: true });

  const connection = new Sqlite(filePath, { fileMustExist: !create });
  let copy: string | undefined;
  try {
    connection.pragma("journal_mode = WAL");
    connection.pragma("foreign_keys = ON");
    connection.pragma("busy_timeout = 5000");
    // A company file can come from another computer; its schema never runs functions with the app's rights.
    connection.pragma("trusted_schema = OFF");

    // A file that already holds a company is copied before it is migrated, and
    // put back if the migration leaves it inconsistent.
    if (pendingMigrations(connection, migrationsFolder) > 0 && hasTables(connection)) {
      copy = filePath + ".before-migration";
      connection.prepare("VACUUM INTO ?").run(copy);
    }
    migrateDatabase(connection, drizzle(connection, { schema }), migrationsFolder);
  } catch (error) {
    // a file that is not a database, or will not migrate, is left as it was and never held open
    connection.close();
    if (copy !== undefined) restore(filePath, copy);
    throw error;
  }
  if (copy !== undefined) rmSync(copy, { force: true });

  const db = drizzle(connection, { schema });
  return {
    db,
    withTransaction: createTransactionRunner(connection),
    close: () => connection.close(),
  };
}
