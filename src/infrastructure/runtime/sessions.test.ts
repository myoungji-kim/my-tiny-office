import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { excerpt, proposalIn, readArgs } from "./career-read";
import { listSessions, sessionFile } from "./sessions";

let root: string;
beforeEach(() => void (root = mkdtempSync(join(tmpdir(), "mto-sessions-"))));
afterEach(() => rmSync(root, { recursive: true, force: true }));

const NOW = Date.parse("2026-09-26T10:00:00Z");
const ID = "b477a1ec-4706-4cc4-b017-a887aedc242e";

const said = (type: "user" | "assistant", content: unknown, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ type, message: { role: type, content }, cwd: "/code/pay", timestamp: "2026-09-20T09:00:00Z", entrypoint: "cli", ...extra });

function session(id: string, lines: readonly string[], { dir = "code-pay", ageMs = 3_600_000 } = {}) {
  mkdirSync(join(root, dir), { recursive: true });
  const path = join(root, dir, id + ".jsonl");
  writeFileSync(path, lines.join("\n") + "\n");
  const at = (NOW - ageMs) / 1000;
  utimesSync(path, at, at);
  return path;
}

const talk = (n: number) => Array.from({ length: n }, (_, i) => said(i % 2 ? "assistant" : "user", [{ type: "text", text: `line ${i}` }]));

describe("listSessions", () => {
  it("lists a person's session by its folder, first message, count and dates", () => {
    session(ID, [
      said("user", "<command-name>/clear</command-name>"),
      said("user", "결제 재시도 로직을 정리하자"),
      said("assistant", [{ type: "text", text: "네" }, { type: "tool_use", name: "Read" }]),
      said("user", [{ type: "tool_result", content: "…" }]),
      ...talk(4),
    ]);

    expect(listSessions(root, NOW)).toEqual([
      { id: ID, folder: "/code/pay", firstMessage: "결제 재시도 로직을 정리하자", messages: 6, from: Date.parse("2026-09-20T09:00:00Z"), to: NOW - 3_600_000, inUse: false },
    ]);
    expect(sessionFile(ID, root)).toBe(join(root, "code-pay", ID + ".jsonl"));
  });

  it("leaves out runs by a program, the app's own folders, short and old sessions", () => {
    session("11111111-1111-4111-8111-111111111111", talk(8).map((l) => l.replace('"entrypoint":"cli"', '"entrypoint":"sdk-cli"')));
    session("22222222-2222-4222-8222-222222222222", talk(8).map((l) => l.replace('"/code/pay"', '"/code/pay/.worktrees/b477a1ec-4706-4cc4-b017-a887aedc242e"')));
    session("33333333-3333-4333-8333-333333333333", talk(3));
    session("44444444-4444-4444-8444-444444444444", talk(8), { ageMs: 91 * 86_400_000 });
    session("not-a-session", talk(8));

    expect(listSessions(root, NOW)).toEqual([]);
  });

  it("says a session written to a minute ago is in use", () => {
    session(ID, talk(8), { ageMs: 60_000 });
    expect(listSessions(root, NOW)[0].inUse).toBe(true);
  });
});

describe("excerpt", () => {
  it("keeps what was said, and never a line that looks like a secret", () => {
    const cut = excerpt(
      [
        said("user", "배포 스크립트 좀 봐줘\nAPI_KEY=sk-abcdefghijklmnopqrstuvwx"),
        said("assistant", [{ type: "text", text: "토큰은 환경 변수로 옮겨요." }, { type: "tool_use", name: "Bash" }]),
        said("user", [{ type: "tool_result", content: "ghp_aaaaaaaaaaaaaaaaaaaaaaaa" }]),
      ].join("\n"),
    );

    expect(cut).toEqual({ text: "User: 배포 스크립트 좀 봐줘\n\nClaude: 토큰은 환경 변수로 옮겨요.", dropped: 1, cut: false });
  });
});

describe("proposalIn", () => {
  const areas = [{ id: "a1", name: "Database" }];
  const answer = (result: string) => JSON.stringify({ type: "result", subtype: "success", is_error: false, result });

  it("keeps lines of the shape asked for, in areas the company has", () => {
    const text = 'Here: {"knows":[{"area":"a1","text":" Retries share a key. "},{"area":"zz","text":"x"}],"style":["Small commits", 3]}';
    expect(proposalIn(answer(text), areas)).toEqual({ knows: [{ area: "a1", text: "Retries share a key." }], style: ["Small commits"] });
  });

  it("finds nothing in a failed run or an answer that is not JSON", () => {
    expect(proposalIn(JSON.stringify({ subtype: "error_max_budget_usd", is_error: true }), areas)).toBeUndefined();
    expect(proposalIn(answer("I could not."), areas)).toBeUndefined();
  });
});

describe("readArgs", () => {
  it("gives the summing-up run no tools, no settings of the user's and no MCP, with an option after --tools", () => {
    const args = readArgs();
    expect(args[args.indexOf("--tools") + 1]).toBe("");
    expect(args[args.indexOf("--tools") + 2]).toMatch(/^--/);
    expect(args[args.indexOf("--setting-sources") + 1]).toBe("");
    expect(args).toContain("--strict-mcp-config");
  });
});
