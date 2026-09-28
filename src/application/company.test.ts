import { assert, describe, expect, it } from "vitest";

import { toCompanyId } from "../domain/ids";

import { createCompany, renameCompany } from "./company";
import { createTestContext } from "./test-context";

const foundedAt = 1_700_000_000_000;

describe("renameCompany", () => {
  it("renames the company with a name it can take", async () => {
    const ctx = createTestContext(() => foundedAt);
    const created = await createCompany(ctx, { name: "TinySoft" });
    assert(created.ok);

    await expect(renameCompany(ctx, created.value.company.id, " Tiny Lab ")).resolves.toMatchObject({ ok: true, value: { company: { name: "Tiny Lab", foundedAt } } });
    await expect(renameCompany(ctx, created.value.company.id, " ")).resolves.toEqual({ ok: false, reason: "nameRequired" });
  });
});

describe("createCompany", () => {
  it("saves the company with its areas, roles and first line of history", async () => {
    const ctx = createTestContext(() => foundedAt);

    const created = await createCompany(ctx, { name: "TinySoft", description: "A tiny office" });
    assert(created.ok);

    const { company } = created.value;
    expect(company).toMatchObject({ id: toCompanyId("id-1"), name: "TinySoft", foundedAt });
    await expect(ctx.companies.findById(company.id)).resolves.toEqual(company);
    await expect(ctx.areas.findByCompany(company.id)).resolves.toHaveLength(7);
    await expect(ctx.roles.findByCompany(company.id)).resolves.toHaveLength(6);
    await expect(ctx.milestones.findByCompany(company.id)).resolves.toMatchObject([{ kind: "founded" }]);
    expect(created.events).toMatchObject([{ type: "CompanyCreated", name: "TinySoft" }]);
  });

  it("makes nothing when the name will not do", async () => {
    const ctx = createTestContext();

    await expect(createCompany(ctx, { id: toCompanyId("c"), name: "" })).resolves.toEqual({ ok: false, reason: "nameRequired" });
    await expect(ctx.companies.findById(toCompanyId("c"))).resolves.toBeUndefined();
  });
});
