import { describe, expect, it } from "vitest";

import { costText } from "./money";

describe("a cost on screen", () => {
  it("is dollars to the cent, and a sliver still reads as spent", () => {
    expect(costText(0.1414)).toBe("$0.14");
    expect(costText(2)).toBe("$2.00");
    expect(costText(0.004)).toBe("<$0.01");
  });
});
