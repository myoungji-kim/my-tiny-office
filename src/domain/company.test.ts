import { describe, expect, it } from "vitest";

import { createCompany } from "./company";
import { toCompanyId, toEventId } from "./ids";

const companyId = toCompanyId("company-1");
const eventId = toEventId("event-1");
const now = 1_700_000_000_000;

describe("createCompany", () => {
  it("founds the company at the given time", () => {
    const { company } = createCompany({ id: companyId, name: "TinySoft" }, eventId, now);

    expect(company).toEqual({
      id: companyId,
      name: "TinySoft",
      description: undefined,
      foundedAt: now,
    });
  });

  it("emits CompanyCreated", () => {
    const { events } = createCompany(
      { id: companyId, name: "TinySoft", description: "A tiny office" },
      eventId,
      now,
    );

    expect(events).toEqual([
      {
        eventId,
        type: "CompanyCreated",
        occurredAt: now,
        companyId,
        name: "TinySoft",
      },
    ]);
  });
});
