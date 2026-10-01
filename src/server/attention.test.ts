import { describe, expect, it } from "vitest";

import { attentionOf } from "./attention";
import type { TodayItem } from "./today";

const item = (over: Partial<TodayItem>): TodayItem => ({
  at: 10,
  kind: "waiting",
  who: "e1",
  task: { id: "t1", title: "Write a greeting", projectId: "p1" },
  areaId: undefined,
  memory: undefined,
  took: 3,
  brought: undefined,
  open: true,
  ...over,
});

describe("what the desktop app tells the user", () => {
  it("says only what still waits on them, in their language, opening on its task", () => {
    const items = [item({}), item({ kind: "lost", at: 20 }), item({ kind: "stopped", at: 30, open: false }), item({ kind: "started", at: 40 })];

    const said = attentionOf("c1", "TinySoft", items, { e1: "모카" }, "ko");

    expect(said).toEqual([
      { key: "c1:waiting:t1:10", title: "TinySoft", body: "모카가 Write a greeting을 마쳤어요 · 3분 · 승인을 기다려요", href: "/attention/open?company=c1&task=t1" },
      { key: "c1:lost:t1:20", title: "TinySoft", body: "모카의 Claude Code 연결이 끊겼어요 · Write a greeting", href: "/attention/open?company=c1&task=t1" },
    ]);
    expect(attentionOf("c1", "TinySoft", [item({})], { e1: "Mocha" }, "en")[0].body).toContain("Mocha");
  });
});
