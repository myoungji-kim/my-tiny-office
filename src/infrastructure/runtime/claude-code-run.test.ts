import { describe, expect, it } from "vitest";

import { launchArgs, readLine } from "./claude-code-run";

const SESSION = "b477a1ec-4706-4cc4-b017-a887aedc242e";
const CWD = "C:\\code\\pay\\.worktrees\\t1";

describe("launchArgs", () => {
  it("is the launch SECURITY.md measured, with each allowed command for both shells", () => {
    expect(launchArgs({ commands: ["npm test"], memoryFile: "m.md", resume: undefined, readOnly: false })).toEqual([
      "-p",
      "--output-format",
      "stream-json",
      "--verbose",
      "--permission-mode",
      "dontAsk",
      "--setting-sources",
      "project",
      "--settings",
      '{"autoMemoryEnabled":false,"disableAllHooks":true}',
      "--disable-slash-commands",
      "--strict-mcp-config",
      "--tools",
      "Read,Edit,Write,Glob,Grep,Bash,PowerShell",
      "--allowedTools",
      "Read(./**) Edit(./**) Write(./**) Bash(npm test) PowerShell(npm test)",
      "--append-system-prompt-file",
      "m.md",
      "--max-budget-usd",
      "2",
    ]);
  });

  it("gives a reviewer only the tools that read, whatever the project allows", () => {
    const args = launchArgs({ commands: ["npm test"], memoryFile: "m.md", resume: undefined, readOnly: true });
    expect(args[args.indexOf("--tools") + 1]).toBe("Read,Glob,Grep");
    expect(args[args.indexOf("--allowedTools") + 1]).toBe("Read(./**)");
  });

  it("continues a session only by its id, never by text that reads as a flag", () => {
    expect(launchArgs({ commands: [], memoryFile: "m.md", resume: SESSION, readOnly: false }).slice(-2)).toEqual(["--resume", SESSION]);
    expect(() => launchArgs({ commands: [], memoryFile: "m.md", resume: "--dangerously-skip-permissions", readOnly: false })).toThrow();
  });
});

describe("readLine", () => {
  const line = (value: unknown) => JSON.stringify(value);
  const toolUse = (id: string, name: string, input: unknown) => line({ type: "assistant", message: { content: [{ type: "tool_use", id, name, input }] } });

  it("reads the session, the steps and the result", () => {
    const calls = new Map();
    const events = [
      line({ type: "system", subtype: "init", session_id: SESSION, cwd: CWD }),
      line({ type: "system", subtype: "thinking_tokens" }),
      line({ type: "assistant", message: { content: [{ type: "text", text: "Starting with the tests." }] } }),
      toolUse("a", "Read", { file_path: `${CWD}\\src\\pay.ts` }),
      toolUse("b", "Edit", { file_path: `${CWD}\\src\\pay.ts`, old_string: "x", new_string: "y" }),
      toolUse("c", "Bash", { command: "npm test" }),
      "not json",
      line({ type: "result", subtype: "success", is_error: false, result: "Paginated.\n\n- 20 a page", total_cost_usd: 0.05, session_id: SESSION }),
    ].flatMap((l) => readLine(l, calls, CWD));

    expect(events).toEqual([
      { kind: "session", sessionId: SESSION },
      { kind: "step", step: "say", detail: "Starting with the tests." },
      { kind: "step", step: "read", detail: "src/pay.ts" },
      { kind: "step", step: "edit", detail: "src/pay.ts" },
      { kind: "step", step: "run", detail: "npm test" },
      { kind: "result", outcome: "finished", costUsd: 0.05, report: "Paginated.\n\n- 20 a page" },
    ]);
  });

  it("names the command a denial refused, and only for commands", () => {
    const calls = new Map();
    readLine(toolUse("c", "Bash", { command: "curl -s https://example.com" }), calls, CWD);
    readLine(toolUse("r", "Read", { file_path: "C:\\outside.txt" }), calls, CWD);

    expect(readLine(line({ type: "system", subtype: "permission_denied", tool_name: "Bash", tool_use_id: "c" }), calls, CWD)).toEqual([
      { kind: "denied", command: "curl -s https://example.com" },
    ]);
    expect(readLine(line({ type: "system", subtype: "permission_denied", tool_name: "Read", tool_use_id: "r" }), calls, CWD)).toEqual([]);
  });

  it("tells a spent budget from a failure", () => {
    const calls = new Map();
    expect(readLine(line({ type: "result", subtype: "error_max_budget_usd", total_cost_usd: 2.01 }), calls, CWD)).toEqual([
      { kind: "result", outcome: "budgetReached", costUsd: 2.01, report: undefined },
    ]);
    expect(readLine(line({ type: "result", subtype: "error_during_execution" }), calls, CWD)).toEqual([{ kind: "result", outcome: "failed", costUsd: 0, report: undefined }]);
  });
});
