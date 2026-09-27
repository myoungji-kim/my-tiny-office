import { afterEach, assert, beforeEach, describe, expect, it } from "vitest";

import { createCompany } from "../../application/company";
import type { AppContext } from "../../application/context";
import { hireEmployee } from "../../application/employee";
import { createProject, startProject } from "../../application/project";
import { createTask, pickUpWork } from "../../application/task";
import { toCompanyId } from "../../domain/ids";
import { createAppContext } from "../app-context";

import { createTestDatabase, type TestDatabase } from "./test-database";

const companyId = toCompanyId("c");
let database: TestDatabase;
let ctx: AppContext;

beforeEach(async () => {
  database = createTestDatabase();
  ctx = createAppContext(database.handle);
  await createCompany(ctx, { id: companyId, name: "TinySoft" });
  const made = await createProject(ctx, { companyId, name: "pay", priority: "normal", folder: "/code/pay" });
  assert(made.ok);
  assert((await startProject(ctx, made.value.project.id)).ok);
  for (const title of ["one", "two"]) {
    assert((await createTask(ctx, { companyId, projectId: made.value.project.id, title, priority: "normal" })).ok);
  }
  for (const name of ["모카", "두부"]) {
    assert((await hireEmployee(ctx, { companyId, name, role: "Engineer" })).ok);
  }
});

afterEach(() => {
  database.cleanup();
});

describe("pickUpWork on SQLite", () => {
  it("starts everything it picked, or nothing", async () => {
    let saves = 0;
    const failing: AppContext = {
      ...ctx,
      tasks: {
        ...ctx.tasks,
        async save(task) {
          saves += 1;
          if (saves === 2) throw new Error("disk full");
          await ctx.tasks.save(task);
        },
      },
    };

    await expect(pickUpWork(failing, companyId)).rejects.toThrow("disk full");

    const tasks = await ctx.tasks.findByCompany(companyId);
    expect(tasks.map((t) => t.status)).toEqual(["backlog", "backlog"]);
  });
});
