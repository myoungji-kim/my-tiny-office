import { describe, expect, it } from "vitest";

import { hasBatchim, withParticle } from "./korean";

describe("the particle after a word", () => {
  it("follows the last Hangul syllable", () => {
    expect(withParticle("모카", "이", "가")).toBe("모카가");
    expect(withParticle("단풍", "이", "가")).toBe("단풍이");
  });

  it("reads an English ending the way it is said in Korean", () => {
    expect(withParticle("Write a greeting", "을", "를")).toBe("Write a greeting을");
    expect(withParticle("Mocha", "이", "가")).toBe("Mocha가");
    for (const word of ["team", "plan", "mail", "chat", "book", "Pip", "Walnut"]) expect(hasBatchim(word)).toBe(true);
    for (const word of ["test", "check", "Docker", "Maple", "Tofu", "fix the bug."]) expect(hasBatchim(word)).toBe(false);
  });

  it("reads an acronym letter by letter, and a number as a number", () => {
    expect(withParticle("PR", "을", "를")).toBe("PR을");
    expect(withParticle("API", "을", "를")).toBe("API를");
    expect(withParticle("HTML", "이", "가")).toBe("HTML이");
    expect(withParticle("v3", "을", "를")).toBe("v3을");
    expect(withParticle("2", "을", "를")).toBe("2를");
  });
});
