import { mkdirSync } from "node:fs";
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
  // A company file can come from another computer; its schema never runs functions with the app's rights.
  connection.pragma("trusted_schema = OFF");

  const db = drizzle(connection, { schema });
  migrate(db, { migrationsFolder: join(process.cwd(), MIGRATIONS_FOLDER) });

  return {
    db,
    withTransaction: createTransactionRunner(connection),
    close: () => connection.close(),
  };
}
