import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Sqlite from "better-sqlite3";
import { afterEach, assert, beforeEach, describe, expect, it } from "vitest";

import { createCompany } from "../../application/company";
import { createProject } from "../../application/project";
import { toCompanyId } from "../../domain/ids";
import { createAppContext } from "../app-context";

import { createCompanyFiles, type CompanyFiles } from "./company-files";
import { importCompany } from "./import-company";

let directory: string;
let files: CompanyFiles;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "mto-import-"));
  files = createCompanyFiles(directory);
});

afterEach(() => {
  files.close();
  rmSync(directory, { recursive: true, force: true });
});

// An exported company, as the settings screen would hand it over.
async function exported(tamper?: (file: Sqlite.Database) => void): Promise<Uint8Array> {
  const id = toCompanyId(randomUUID());
  const ctx = createAppContext(files.create(id));
  assert((await createCompany(ctx, { id, name: "TinySoft" })).ok);
  assert((await createProject(ctx, { companyId: id, name: "pay", priority: "normal", folder: "/code/pay" })).ok);
  const copy = join(directory, `${randomUUID()}.db`);
  files.open(id).copyTo(copy);
  files.remove(id);
  if (tamper !== undefined) {
    const file = new Sqlite(copy);
    tamper(file);
    file.close();
  }
  return readFileSync(copy);
}

describe("importCompany", () => {
  it("adds the company under an id of this computer, with its folders to choose again", async () => {
    const imported = importCompany(files, await exported());

    assert(imported.ok);
    expect(imported).toMatchObject({ name: "TinySoft", foldersToChoose: 1 });
    const ctx = createAppContext(files.open(imported.companyId));
    await expect(ctx.companies.findById(imported.companyId)).resolves.toMatchObject({ name: "TinySoft" });
    const [project] = await ctx.projects.findByCompany(imported.companyId);
    expect(project).toMatchObject({ name: "pay", folder: "/code/pay", folderConfirmed: false });
    expect(files.ids()).toEqual([imported.companyId]);
  });

  it("brings a file from an older version up to this one", async () => {
    const bytes = await exported((file) => {
      file.exec("alter table projects drop column folder_confirmed");
      file.exec("delete from __drizzle_migrations where created_at = (select max(created_at) from __drizzle_migrations)");
    });

    const imported = importCompany(files, bytes);

    expect(imported).toMatchObject({ ok: true, foldersToChoose: 1 });
  });

  it("refuses what is not a company file, and leaves nothing behind", () => {
    expect(importCompany(files, new TextEncoder().encode("not a database"))).toEqual({ ok: false, reason: "notACompany" });
    expect(importCompany(files, new Uint8Array())).toEqual({ ok: false, reason: "notACompany" });
    expect(files.ids()).toEqual([]);
  });

  it("refuses a file that would run anything of its own", async () => {
    const bytes = await exported((file) => file.exec("create trigger t after insert on roles begin delete from companies; end;"));

    expect(importCompany(files, bytes)).toEqual({ ok: false, reason: "notACompany" });
  });

  it("refuses a file from a newer version of the app", async () => {
    const bytes = await exported((file) => file.exec("insert into __drizzle_migrations (hash, created_at) values ('later', 1)"));

    expect(importCompany(files, bytes)).toEqual({ ok: false, reason: "fromNewerVersion" });
  });
});
