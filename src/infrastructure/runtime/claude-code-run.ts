import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { AgentEvent, AgentRuntime, LaunchInput } from "../../application/agent-runtime";
import type { AtlassianWrite } from "../../domain/project";
import { stepDetail, type StepKind } from "../../domain/run";
import { findExecutable, startProcess } from "../process/run";
import { atlassianTools, writeOf, writeShown } from "./connectors";

// A runaway stop, not a budget: fixed, and not a setting (SECURITY.md §2).
const MAX_BUDGET_USD = "2";

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const isSessionId = (value: unknown): value is string => typeof value === "string" && SESSION_ID.test(value);

// Exactly the launch SECURITY.md measured; anything added here is measured first.
export function launchArgs(input: {
  readonly commands: readonly string[];
  readonly atlassian: { readonly writes: readonly AtlassianWrite[] } | undefined;
  readonly memoryFile: string;
  readonly resume: string | undefined;
  readonly readOnly: boolean;
}): string[] {
  // a reviewer's session has only the tools that read, confined to the worktree
  // connector tools arrive deferred, and ToolSearch is what loads them
  const connector = input.readOnly ? undefined : input.atlassian;
  const tools = input.readOnly ? "Read,Glob,Grep" : "Read,Edit,Write,Glob,Grep,Bash,PowerShell" + (connector === undefined ? "" : ",ToolSearch");
  const allowed = input.readOnly
    ? ["Read(./**)"]
    : ["Read(./**)", "Edit(./**)", "Write(./**)", ...input.commands.flatMap((c) => [`Bash(${c})`, `PowerShell(${c})`]), ...(connector === undefined ? [] : ["ToolSearch", ...atlassianTools(connector.writes)])];
  const args = [
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
    "--permission-mode",
    "dontAsk",
    "--setting-sources",
    "project",
    "--settings",
    JSON.stringify({ autoMemoryEnabled: false, disableAllHooks: true }),
    "--disable-slash-commands",
    // without it the account's connectors join the session; allowed by name only
    ...(connector === undefined ? ["--strict-mcp-config"] : []),
    "--tools",
    tools,
    "--allowedTools",
    allowed.join(" "),
    "--append-system-prompt-file",
    input.memoryFile,
    "--max-budget-usd",
    MAX_BUDGET_USD,
  ];
  if (input.resume !== undefined) {
    if (!isSessionId(input.resume)) throw new Error("Not a session id");
    args.push("--resume", input.resume);
  }
  return args;
}

const TOOL_STEP: Readonly<Record<string, StepKind>> = {
  Read: "read",
  Glob: "read",
  Grep: "read",
  Edit: "edit",
  Write: "edit",
  Bash: "run",
  PowerShell: "run",
};

const COMMAND_TOOLS = new Set(["Bash", "PowerShell"]);

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null;
const text = (value: unknown): string => (typeof value === "string" ? value : "");

// What a tool call is about, said relative to the worktree.
function subject(input: Json, cwd: string): string {
  const raw = text(input.file_path) || text(input.command) || text(input.pattern) || text(input.path);
  const forward = (s: string) => s.split("\\").join("/");
  const base = forward(cwd).replace(/\/$/, "") + "/";
  return forward(raw).startsWith(base) ? forward(raw).slice(base.length) : raw;
}

// Reads one stream-json line. Tool calls are remembered by id, because a
// denial names only the call, and the command is in the call.
export function readLine(line: string, calls: Map<string, { tool: string; command: string; input: Json }>, cwd: string): AgentEvent[] {
  let event: unknown;
  try {
    event = JSON.parse(line);
  } catch {
    return [];
  }
  if (!isObject(event)) return [];

  if (event.type === "system" && event.subtype === "init") {
    return isSessionId(event.session_id) ? [{ kind: "session", sessionId: event.session_id }] : [];
  }
  if (event.type === "system" && event.subtype === "permission_denied") {
    const call = calls.get(text(event.tool_use_id));
    if (call === undefined) return [];
    if (COMMAND_TOOLS.has(call.tool)) return call.command !== "" ? [{ kind: "denied", command: call.command }] : [];
    const write = writeOf(call.tool);
    return write === undefined ? [] : [{ kind: "writeDenied", write, ...writeShown(call.input) }];
  }
  if (event.type === "assistant" && isObject(event.message) && Array.isArray(event.message.content)) {
    const out: AgentEvent[] = [];
    for (const block of event.message.content) {
      if (!isObject(block)) continue;
      if (block.type === "text" && text(block.text).trim() !== "") {
        out.push({ kind: "step", step: "say", detail: stepDetail(text(block.text)) });
      }
      if (block.type === "tool_use" && isObject(block.input)) {
        const tool = text(block.name);
        calls.set(text(block.id), { tool, command: text(block.input.command).trim(), input: block.input });
        const step = TOOL_STEP[tool];
        if (step !== undefined) out.push({ kind: "step", step, detail: stepDetail(subject(block.input, cwd)) });
      }
    }
    return out;
  }
  if (event.type === "result") {
    const cost = typeof event.total_cost_usd === "number" && Number.isFinite(event.total_cost_usd) ? event.total_cost_usd : 0;
    const outcome = event.subtype === "success" && event.is_error !== true ? "finished" : event.subtype === "error_max_budget_usd" ? "budgetReached" : "failed";
    const report = text(event.result).trim();
    return [{ kind: "result", outcome, costUsd: cost, report: report === "" ? undefined : report }];
  }
  return [];
}

// Claude Code as the runtime: a child process of the app, prompt on stdin.
export const claudeCodeRuntime: AgentRuntime = {
  launch(input: LaunchInput, onEvent, onExit) {
    const found = findExecutable("claude");
    if (found.kind !== "found") {
      queueMicrotask(onExit);
      return { stop: () => undefined };
    }
    // what the employee was taught goes in as a file the session reads at start, removed at exit
    const folder = mkdtempSync(join(tmpdir(), "my-tiny-office-run-"));
    const cleanUp = () => rmSync(folder, { recursive: true, force: true });
    const memoryFile = join(folder, "memory.md");
    try {
      writeFileSync(memoryFile, input.memory);
    } catch (error) {
      cleanUp();
      throw error;
    }
    const calls = new Map<string, { tool: string; command: string; input: Json }>();
    return startProcess(found.path, launchArgs({ commands: input.commands, atlassian: input.atlassian, memoryFile, resume: input.resume, readOnly: input.readOnly }), {
      cwd: input.cwd,
      input: input.prompt,
      onLine: (line) => {
        for (const event of readLine(line, calls, input.cwd)) onEvent(event);
      },
      onExit: () => {
        cleanUp();
        onExit();
      },
    });
  },
};
