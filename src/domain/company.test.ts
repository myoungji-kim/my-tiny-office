import { assert, describe, expect, it } from "vitest";

import { createCompany } from "./company";
import { toCompanyId, toEventId } from "./ids";

const companyId = toCompanyId("company-1");
const eventId = toEventId("event-1");
const now = 1_700_000_000_000;

describe("createCompany", () => {
  it("founds the company at the given time, with the name as written", () => {
    const created = createCompany({ id: companyId, name: " TinySoft ", description: "  " }, eventId, now);
    assert(created.ok);

    expect(created.company).toEqual({ id: companyId, name: "TinySoft", description: undefined, foundedAt: now });
    expect(created.events).toEqual([{ eventId, type: "CompanyCreated", occurredAt: now, companyId, name: "TinySoft" }]);
  });

  it("needs a name of a sensible length", () => {
    expect(createCompany({ id: companyId, name: " " }, eventId, now)).toEqual({ ok: false, reason: "nameRequired" });
    expect(createCompany({ id: companyId, name: "가".repeat(41) }, eventId, now)).toEqual({ ok: false, reason: "nameTooLong" });
  });
});
