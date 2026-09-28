import { describe, expect, it } from "vitest";

import { SPECIES } from "../domain/employee";

import { CAST, paint, PALETTE } from "./paint";

describe("the cast", () => {
  it("draws exactly the species an employee can be", () => {
    expect(CAST.map((c) => c.key).sort()).toEqual([...SPECIES].sort());
  });

  it("uses only letters the palette or the member's own colours know", () => {
    for (const member of CAST) {
      const known = new Set([...Object.keys(PALETTE), ...Object.keys(member.colors), "O"]);
      expect(member.sprite).toHaveLength(16);
      for (const row of member.sprite) {
        expect(row).toHaveLength(16);
        for (const ch of row) expect(known.has(ch)).toBe(true);
      }
    }
  });
});

describe("paint", () => {
  it("fills one rectangle per run of a colour, and resolves design tokens", () => {
    const rects: [string, number, number, number, number][] = [];
    const fake = { fillStyle: "", fillRect: (x: number, y: number, w: number, h: number) => rects.push([fake.fillStyle, x, y, w, h]) };
    const ctx = fake as unknown as CanvasRenderingContext2D;

    paint(ctx, ["KKd.", "...."], 2, 10, 0, undefined, (c) => (c === "var(--floor)" ? "#abcdef" : c));

    expect(rects).toEqual([
      ["#2f2a3d", 10, 0, 4, 2],
      ["#abcdef", 14, 0, 2, 2],
    ]);
  });
});
