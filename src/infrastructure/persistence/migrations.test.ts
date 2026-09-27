import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Sqlite from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { toCompanyId } from "../../domain/ids";

import { migrateDatabase } from "./database";
import { createSqliteEmployeeRepository } from "./employee-repository";
import { createSqliteMilestoneRepository } from "./history-repository";
import { createSqliteAreaRepository } from "./memory-repository";
import { createSqliteRoleRepository } from "./organisation-repository";
import { createSqliteProjectRepository } from "./project-repository";
import * as schema from "./schema";
import { createSqliteTaskRepository } from "./task-repository";

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), "my-tiny-office-migrations-"));
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

// The migrations as they stood before projects existed.
function migrationsUpTo(count: number): string {
  const folder = join(directory, `drizzle-${count}`);
  cpSync(join(process.cwd(), "drizzle"), folder, { recursive: true });
  const journalPath = join(folder, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { entries: unknown[] };
  writeFileSync(journalPath, JSON.stringify({ ...journal, entries: journal.entries.slice(0, count) }));
  return folder;
}

describe("moving to projects", () => {
  it("keeps every task made before projects, in a planned project of its company", async () => {
    const connection = new Sqlite(join(directory, "old.db"));
    const db = drizzle(connection, { schema });
    migrateDatabase(connection, db, migrationsUpTo(2));

    const t0 = 1_700_000_000_000;
    connection.exec(`
      insert into companies values ('c', 'TinySoft', null, ${t0});
      insert into employees values ('mocha', 'c', '모카', 'Backend Developer', 'available', ${t0});
      insert into employees values ('tofu', 'c', '두부', 'Frontend Developer', 'onVacation', ${t0});
      insert into tasks values ('queued', 'c', 'Queued', null, 'backlog', 'low', null, 60000, ${t0}, null, null);
      insert into tasks values ('ready', 'c', 'Ready', null, 'ready', 'normal', 'mocha', 60000, ${t0 + 1}, null, null);
      insert into tasks values ('running', 'c', 'Running', null, 'working', 'high', 'mocha', 60000, ${t0 + 2}, ${t0 + 3}, null);
      insert into tasks values ('done', 'c', 'Done', 'kept', 'done', 'normal', 'mocha', 60000, ${t0 + 4}, ${t0 + 5}, ${t0 + 65});
    `);

    migrateDatabase(connection, db, join(process.cwd(), "drizzle"));

    const projects = await createSqliteProjectRepository(db).findByCompany(toCompanyId("c"));
    expect(projects).toMatchObject([{ status: "planned", folder: undefined, companyId: "c" }]);

    const tasks = await createSqliteTaskRepository(db).findByCompany(toCompanyId("c"));
    expect(tasks.map((t) => [t.id, t.status, t.assigneeId, t.projectId])).toEqual([
      ["queued", "backlog", undefined, projects[0].id],
      ["ready", "backlog", "mocha", projects[0].id],
      ["running", "backlog", "mocha", projects[0].id],
      ["done", "done", "mocha", projects[0].id],
    ]);
    expect(tasks[3]).toMatchObject({ description: "kept", workedFor: 60, finishedAt: t0 + 65, appliedAt: t0 + 65 });

    const people = await createSqliteEmployeeRepository(db).findByCompany(toCompanyId("c"));
    expect(people.map((e) => [e.id, e.availability])).toEqual([["mocha", "available"], ["tofu", "onLeave"]]);

    // each keeps the title they held, as a role of the company, next to the six it starts with
    const roles = await createSqliteRoleRepository(db).findByCompany(toCompanyId("c"));
    const titleOf = (id: string) => roles.find((r) => r.id === people.find((e) => e.id === id)!.roleId)?.name;
    expect([titleOf("mocha"), titleOf("tofu")]).toEqual(["Backend Developer", "Frontend Developer"]);
    expect(roles.map((r) => r.name)).toEqual(expect.arrayContaining(["Backend Engineer", "QA Engineer", "Backend Developer"]));
    expect(people.every((e) => e.species === "cat" && e.teamId === undefined)).toBe(true);

    // what the history can know exactly: the founding, and each hire with the first called out
    const history = await createSqliteMilestoneRepository(db).findByCompany(toCompanyId("c"));
    expect(history).toMatchObject([
      { kind: "founded", at: t0 },
      { kind: "joined", employeeName: "모카", first: true },
      { kind: "joined", employeeName: "두부", first: false },
    ]);

    const areas = await createSqliteAreaRepository(db).findByCompany(toCompanyId("c"));
    expect(areas.map((a) => a.starting)).toEqual(["architecture", "typeSafety", "database", "security", "localization", "product", "quality"]);
    connection.close();
  });

  it("makes no project for a company that had no tasks", async () => {
    const connection = new Sqlite(join(directory, "empty.db"));
    const db = drizzle(connection, { schema });
    migrateDatabase(connection, db, migrationsUpTo(2));
    connection.exec(`insert into companies values ('c', 'TinySoft', null, 1)`);

    migrateDatabase(connection, db, join(process.cwd(), "drizzle"));

    await expect(createSqliteProjectRepository(db).findByCompany(toCompanyId("c"))).resolves.toEqual([]);
    connection.close();
  });
});
