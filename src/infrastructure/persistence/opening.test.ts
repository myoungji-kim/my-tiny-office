import { randomUUID } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createCompany } from "../../application/company";
import { toCompanyId } from "../../domain/ids";
import { loadOffice } from "../../server/view-model";
import { createAppContext } from "../app-context";

import { createCompanyFiles } from "./company-files";
import { openDatabase } from "./database";

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "my-tiny-office-open-"));
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

// The real migrations, plus one that leaves a reference to a row that does not exist.
function migrationsWithABrokenOne(): string {
  const folder = join(directory, "drizzle");
  cpSync(join(process.cwd(), "drizzle"), folder, { recursive: true });
  writeFileSync(join(folder, "9999_broken.sql"), "INSERT INTO `roles` (`id`, `company_id`, `name`, `created_at`) VALUES ('r', 'nobody', 'x', 1);");
  const journalPath = join(folder, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { entries: { idx: number; when: number }[] };
  const last = journal.entries.at(-1)!;
  journal.entries.push({ ...last, idx: last.idx + 1, when: last.when + 1, tag: "9999_broken" } as never);
  writeFileSync(journalPath, JSON.stringify(journal));
  return folder;
}

describe("opening a company file", () => {
  it("puts the file back as it was when a migration breaks its references", async () => {
    const file = join(directory, "company.db");
    const first = openDatabase(file);
    await createCompany(createAppContext(first), { id: toCompanyId(randomUUID()), name: "TinySoft" });
    first.close();

    expect(() => openDatabase(file, { migrationsFolder: migrationsWithABrokenOne() })).toThrow(/references/);

    const reopened = openDatabase(file);
    const rows = reopened.db.all(sql`select id from roles where company_id = 'nobody'`);
    expect(rows).toEqual([]);
    expect(existsSync(file + ".before-migration")).toBe(false);
    reopened.close();
  });

  it("never makes a file for a company that is not there", () => {
    const files = createCompanyFiles(directory);
    const id = toCompanyId(randomUUID());

    expect(() => files.open(id)).toThrow();
    expect(files.has(id)).toBe(false);
    files.close();
  });

  it("opens every other company when one file cannot be read", async () => {
    const files = createCompanyFiles(directory);
    const id = toCompanyId(randomUUID());
    await createCompany(createAppContext(files.create(id)), { id, name: "TinySoft" });
    mkdirSync(join(directory, "companies"), { recursive: true });
    writeFileSync(join(directory, "companies", `${randomUUID()}.db`), "not a database");

    const office = await loadOffice(undefined, { files });

    expect(office.company?.name).toBe("TinySoft");
    expect(office.unreadable).toBe(1);
    files.close();
  });
});
