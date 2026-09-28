import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import Sqlite from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { toCompanyId, type CompanyId } from "../../domain/ids";

import type { CompanyFiles } from "./company-files";
import { migrateDatabase } from "./database";
import * as schema from "./schema";

export type ImportResult =
  | { readonly ok: true; readonly companyId: CompanyId; readonly name: string; readonly foldersToChoose: number }
  | { readonly ok: false; readonly reason: "notACompany" | "fromNewerVersion" };

// A 64 MB company is far past anything the app writes; more is not a company file.
export const MAX_IMPORT_BYTES = 64 * 1024 * 1024;

const MIGRATIONS_FOLDER = join(process.cwd(), "drizzle");

// The tables a company file may hold: this version's, which include every earlier one's.
function knownTables(): Set<string> {
  const empty = new Sqlite(":memory:");
  try {
    migrateDatabase(empty, drizzle(empty, { schema }), MIGRATIONS_FOLDER);
    const rows = empty.prepare("select name from sqlite_master where type = 'table'").all() as { name: string }[];
    return new Set(rows.map((r) => r.name));
  } finally {
    empty.close();
  }
}

const migrationsKnown = (): number =>
  (JSON.parse(readFileSync(join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8")) as { entries: unknown[] }).entries.length;

// A file from anywhere is not trusted: it is checked as a copy, before any of
// it is opened as a company. It gets an id of this computer's, and its project
// folders keep their paths but wait to be chosen again: a folder is this
// computer's to choose.
function prepare(copy: string, id: CompanyId): ImportResult {
  const file = new Sqlite(copy, { fileMustExist: true });
  try {
    file.pragma("trusted_schema = OFF");
    if (file.pragma("integrity_check", { simple: true }) !== "ok") return { ok: false, reason: "notACompany" };

    const objects = file.prepare("select type, name from sqlite_master where name not like 'sqlite_%'").all() as { type: string; name: string }[];
    const known = knownTables();
    // nothing in the file runs on its own: no triggers, no views, no tables the app does not know
    if (objects.some((o) => (o.type !== "table" && o.type !== "index") || (o.type === "table" && !known.has(o.name)))) {
      return { ok: false, reason: "notACompany" };
    }
    if (!objects.some((o) => o.name === "companies") || !objects.some((o) => o.name === "__drizzle_migrations")) {
      return { ok: false, reason: "notACompany" };
    }
    const applied = (file.prepare("select count(*) as n from __drizzle_migrations").get() as { n: number }).n;
    if (applied > migrationsKnown()) return { ok: false, reason: "fromNewerVersion" };

    const companies = file.prepare("select id, name from companies").all() as { id: string; name: string }[];
    if (companies.length !== 1 || typeof companies[0].name !== "string") return { ok: false, reason: "notACompany" };

    // an older file is brought up to this version before anything in it changes
    migrateDatabase(file, drizzle(file, { schema }), MIGRATIONS_FOLDER);
    const tables = file.prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%'").all() as { name: string }[];

    file.pragma("foreign_keys = OFF");
    let foldersToChoose = 0;
    file.transaction(() => {
      for (const { name } of tables) {
        const columns = file.pragma(`table_info("${name}")`) as { name: string }[];
        if (columns.some((c) => c.name === "company_id")) file.prepare(`update "${name}" set company_id = ?`).run(id);
      }
      file.prepare("update companies set id = ?").run(id);
      foldersToChoose = file.prepare("update projects set folder_confirmed = 0 where folder is not null").run().changes;
    })();
    if ((file.pragma("foreign_key_check") as unknown[]).length > 0) return { ok: false, reason: "notACompany" };
    return { ok: true, companyId: id, name: companies[0].name, foldersToChoose };
  } finally {
    file.close();
  }
}

export function importCompany(files: CompanyFiles, bytes: Uint8Array): ImportResult {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_IMPORT_BYTES) return { ok: false, reason: "notACompany" };
  const folder = join(files.directory, "imports");
  mkdirSync(folder, { recursive: true });
  const copy = join(folder, `${randomUUID()}.db`);
  const id = toCompanyId(randomUUID());
  try {
    writeFileSync(copy, bytes);
    let prepared: ImportResult;
    try {
      prepared = prepare(copy, id);
    } catch {
      return { ok: false, reason: "notACompany" };
    }
    if (!prepared.ok) return prepared;

    mkdirSync(dirname(files.pathOf(id)), { recursive: true });
    renameSync(copy, files.pathOf(id));
    try {
      files.open(id);
    } catch {
      files.remove(id);
      return { ok: false, reason: "notACompany" };
    }
    return prepared;
  } finally {
    for (const suffix of ["", "-wal", "-shm"]) rmSync(copy + suffix, { force: true });
  }
}
