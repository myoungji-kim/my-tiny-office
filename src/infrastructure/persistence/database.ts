import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";

import Sqlite from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "./schema";

const APP_DIRECTORY = "my-tiny-office";
const DATABASE_FILE = "my-tiny-office.db";
const MIGRATIONS_FOLDER = "drizzle";

export type AppDatabase = BetterSQLite3Database<typeof schema>;

export interface DatabaseHandle {
  readonly db: AppDatabase;
  readonly withTransaction: <T>(work: () => Promise<T>) => Promise<T>;
  readonly close: () => void;
}

function defaultDatabaseDirectory(): string {
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local");
    return join(localAppData, APP_DIRECTORY);
  }

  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", APP_DIRECTORY);
  }

  const dataHome = process.env.XDG_DATA_HOME ?? join(homedir(), ".local", "share");
  return join(dataHome, APP_DIRECTORY);
}

export function resolveDatabasePath(): string {
  const configured = process.env.MY_TINY_OFFICE_DB_PATH;
  if (configured !== undefined && configured !== "") {
    return isAbsolute(configured) ? configured : resolve(configured);
  }

  return join(defaultDatabaseDirectory(), DATABASE_FILE);
}

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

export function openDatabase(filePath: string): DatabaseHandle {
  mkdirSync(dirname(filePath), { recursive: true });

  const connection = new Sqlite(filePath);
  connection.pragma("journal_mode = WAL");
  connection.pragma("foreign_keys = ON");
  connection.pragma("busy_timeout = 5000");

  const db = drizzle(connection, { schema });
  migrate(db, { migrationsFolder: join(process.cwd(), MIGRATIONS_FOLDER) });

  return {
    db,
    withTransaction: createTransactionRunner(connection),
    close: () => connection.close(),
  };
}

const cache = globalThis as typeof globalThis & {
  myTinyOfficeDatabase?: DatabaseHandle;
};

export function getDatabase(): DatabaseHandle {
  cache.myTinyOfficeDatabase ??= openDatabase(resolveDatabasePath());
  return cache.myTinyOfficeDatabase;
}

export function closeDatabase(): void {
  cache.myTinyOfficeDatabase?.close();
  cache.myTinyOfficeDatabase = undefined;
}
