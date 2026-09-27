import { assert, beforeEach, describe, expect, it } from "vitest";

import { toAreaId, toCompanyId } from "../domain/ids";

import { createCompany } from "./company";
import type { AppContext } from "./context";
import { hireEmployee, sendOnLeave } from "./employee";
import {
  createInMemoryAreaRepository,
  createInMemoryCompanyRepository,
  createInMemoryEmployeeRepository,
  createInMemoryMemoryRepository,
  createInMemoryProjectRepository,
  createInMemoryTaskRepository,
  withoutTransaction,
} from "./in-memory-repositories";
import { addArea, forgetMemory, removeArea, renameArea, teachMemory } from "./memory";
import { createProject } from "./project";
import { createTask } from "./task";

const companyId = toCompanyId("c");
let ctx: AppContext;

beforeEach(async () => {
  let counter = 0;
  ctx = {
    companies: createInMemoryCompanyRepository(),
    employees: createInMemoryEmployeeRepository(),
    projects: createInMemoryProjectRepository(),
    tasks: createInMemoryTaskRepository(),
    areas: createInMemoryAreaRepository(),
    memories: createInMemoryMemoryRepository(),
    now: () => 1_700_000_000_000 + counter,
    newId: () => `id-${(counter += 1)}`,
    withTransaction: withoutTransaction,
  };
  await createCompany(ctx, { id: companyId, name: "TinySoft" });
});

const areaByStart = async (starting: string) => (await ctx.areas.findByCompany(companyId)).find((a) => a.starting === starting)!;

async function hire() {
  const hired = await hireEmployee(ctx, { companyId, name: "모카", role: "Backend Engineer" });
  assert(hired.ok);
  return hired.value.employee;
}

describe("a new company's areas", () => {
  it("are the seven it starts with", async () => {
    const areas = await ctx.areas.findByCompany(companyId);

    expect(areas.map((a) => a.starting)).toEqual(["architecture", "typeSafety", "database", "security", "localization", "product", "quality"]);
  });
});

describe("teachMemory", () => {
  it("teaches someone on leave too", async () => {
    const mocha = await hire();
    assert((await sendOnLeave(ctx, mocha.id)).ok);
    const db = await areaByStart("database");

    const taught = await teachMemory(ctx, { companyId, kind: "expertise", employeeId: mocha.id, areaId: db.id, text: "복합 인덱스는 컬럼 순서가 중요해요" });

    expect(taught).toMatchObject({ ok: true, value: { memory: { areaId: db.id } } });
  });

  it("refuses an area the company does not have", async () => {
    const mocha = await hire();

    await expect(teachMemory(ctx, { companyId, kind: "expertise", employeeId: mocha.id, areaId: toAreaId("nope"), text: "x" })).resolves.toMatchObject({
      reason: "areaNotFound",
    });
  });

  it("forgets without keeping an archive", async () => {
    const taught = await teachMemory(ctx, { companyId, kind: "company", text: "커밋은 conventional prefix로" });
    assert(taught.ok);

    assert((await forgetMemory(ctx, companyId, taught.value.memory.id)).ok);
    await expect(ctx.memories.findByCompany(companyId)).resolves.toEqual([]);
  });
});

describe("the company's areas", () => {
  it("are added and renamed", async () => {
    const added = await addArea(ctx, companyId, "게임 서버");
    assert(added.ok);
    const renamed = await renameArea(ctx, companyId, added.value.area.id, "게임 서버 · 매칭");
    assert(renamed.ok);

    expect(renamed.value.area.name).toBe("게임 서버 · 매칭");
  });

  it("move their memory and tasks elsewhere before going", async () => {
    const mocha = await hire();
    const db = await areaByStart("database");
    const arch = await areaByStart("architecture");
    assert((await teachMemory(ctx, { companyId, kind: "expertise", employeeId: mocha.id, areaId: db.id, text: "인덱스" })).ok);
    const pay = await createProject(ctx, { companyId, name: "pay", priority: "normal" });
    assert(pay.ok);
    const task = await createTask(ctx, { companyId, projectId: pay.value.project.id, title: "t", priority: "low", area: db.id });
    assert(task.ok);

    await expect(removeArea(ctx, companyId, db.id)).resolves.toMatchObject({ reason: "areaHoldsMemory" });
    await expect(removeArea(ctx, companyId, db.id, db.id)).resolves.toMatchObject({ reason: "moveTargetNotFound" });

    const removed = await removeArea(ctx, companyId, db.id, arch.id);
    assert(removed.ok);
    expect(removed.value.moved).toBe(1);
    await expect(ctx.memories.findByCompany(companyId)).resolves.toMatchObject([{ areaId: arch.id }]);
    await expect(ctx.tasks.findById(task.value.task.id)).resolves.toMatchObject({ area: arch.id });
    expect((await ctx.areas.findByCompany(companyId)).some((a) => a.id === db.id)).toBe(false);
  });
});
