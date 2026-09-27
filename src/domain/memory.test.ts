import { assert, describe, expect, it } from "vitest";

import { toAreaId, toCompanyId, toEmployeeId, toEventId, toMemoryId, toTaskId } from "./ids";
import {
  addArea,
  expertiseOf,
  MAX_MEMORY_TEXT,
  removeArea,
  renameArea,
  startingAreas,
  STARTING_AREAS,
  teach,
  type Memory,
  type TeachInput,
} from "./memory";

const t0 = 1_700_000_000_000;
const eventId = toEventId("e");
const companyId = toCompanyId("c");
const mocha = toEmployeeId("mocha");
const tofu = toEmployeeId("tofu");
const db = toAreaId("db");

const taught = (input: Partial<TeachInput>): Memory => {
  const result = teach({ id: toMemoryId("m" + Math.random()), companyId, kind: "expertise", employeeId: mocha, areaId: db, text: "복합 인덱스는 컬럼 순서가 중요해요", ...input }, eventId, t0);
  assert(result.ok);
  return result.value;
};

describe("areas", () => {
  it("start as the seven the dictionary names", () => {
    const areas = startingAreas(companyId, STARTING_AREAS.map((_, i) => toAreaId("a" + i)), t0);

    expect(areas.map((a) => a.starting)).toEqual([...STARTING_AREAS]);
    expect(areas.every((a) => a.name === undefined)).toBe(true);
  });

  it("are added and renamed with the words the user wrote", () => {
    const added = addArea({ id: toAreaId("game"), companyId, name: " 게임 서버 " }, eventId, t0);
    assert(added.ok);
    expect(added.value).toMatchObject({ name: "게임 서버", starting: undefined });

    const renamed = renameArea(startingAreas(companyId, STARTING_AREAS.map((_, i) => toAreaId("a" + i)), t0)[2], "DB", eventId, t0);
    assert(renamed.ok);
    expect(renamed.value).toMatchObject({ starting: "database", name: "DB" });
    expect(addArea({ id: toAreaId("x"), companyId, name: "  " }, eventId, t0)).toMatchObject({ reason: "nameRequired" });
  });

  it("are removed only once their memory has moved", () => {
    const area = startingAreas(companyId, STARTING_AREAS.map((_, i) => toAreaId(i === 2 ? "db" : "a" + i)), t0)[2];

    expect(removeArea(area, [taught({})], eventId, t0)).toMatchObject({ reason: "areaHoldsMemory" });
    expect(removeArea(area, [], eventId, t0)).toMatchObject({ ok: true });
  });
});

describe("teach", () => {
  it("keeps expert knowledge with its area and where it came from", () => {
    const memory = taught({ text: "  결제 테이블은 월 단위로 파티셔닝돼 있어요 ", sourceTaskId: toTaskId("t1") });

    expect(memory).toMatchObject({ kind: "expertise", areaId: db, text: "결제 테이블은 월 단위로 파티셔닝돼 있어요", sourceTaskId: "t1" });
  });

  it("gives an area only to expert knowledge, and an employee to everything but company memory", () => {
    const base = { id: toMemoryId("m"), companyId, text: "x" };

    expect(teach({ ...base, kind: "expertise", employeeId: mocha }, eventId, t0)).toMatchObject({ reason: "areaRequired" });
    expect(teach({ ...base, kind: "style", employeeId: mocha, areaId: db }, eventId, t0)).toMatchObject({ reason: "areaNotAllowed" });
    expect(teach({ ...base, kind: "company", employeeId: mocha }, eventId, t0)).toMatchObject({ reason: "employeeNotAllowed" });
    expect(teach({ ...base, kind: "style" }, eventId, t0)).toMatchObject({ reason: "employeeRequired" });
    expect(teach({ ...base, kind: "company" }, eventId, t0)).toMatchObject({ ok: true });
  });

  it("wants a sentence or two", () => {
    expect(teach({ id: toMemoryId("m"), companyId, kind: "company", text: " " }, eventId, t0)).toMatchObject({ reason: "memoryTextRequired" });
    expect(teach({ id: toMemoryId("m"), companyId, kind: "company", text: "가".repeat(MAX_MEMORY_TEXT + 1) }, eventId, t0)).toMatchObject({
      reason: "memoryTextTooLong",
    });
  });
});

describe("what follows from memory", () => {
  it("makes an area someone's expertise once they are taught in it", () => {
    const memories = [taught({}), taught({ kind: "style", areaId: undefined }), taught({ employeeId: tofu, areaId: toAreaId("security") })];

    expect([...expertiseOf(mocha, memories)]).toEqual([db]);
    expect([...expertiseOf(tofu, memories)]).toEqual(["security"]);
  });

});
