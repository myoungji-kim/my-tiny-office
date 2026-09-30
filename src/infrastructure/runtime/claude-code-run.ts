import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { AgentEvent, AgentRuntime, LaunchInput } from "../../application/agent-runtime";
import type { AtlassianWrite } from "../../domain/project";
import { stepDetail, type StepKind } from "../../domain/run";
import { resolveDataDirectory } from "../persistence/data-directory";
import { readSettings } from "../persistence/settings";
import { findExecutable, startProcess } from "../process/run";
import { atlassianServer, atlassianTools, writeOf, writeShown } from "./connectors";
import { pluginDirs, skillNamesIn } from "./extensions";

// A runaway stop, not a budget: fixed, and not a setting (SECURITY.md §2).
const MAX_BUDGET_USD = "2";

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const isSessionId = (value: unknown): value is string => typeof value === "string" && SESSION_ID.test(value);

// Exactly the launch SECURITY.md measured; anything added here is measured first.
export function launchArgs(input: {
  readonly commands: readonly string[];
  readonly atlassian: { readonly writes: readonly AtlassianWrite[]; readonly server: string } | undefined;
  // the chosen plugins' folders, the one carrying the chosen skills among them
  readonly plugins: readonly string[];
  // skills Claude Code would load from the worktree itself, which the agent can edit
  readonly worktreeSkills: readonly string[];
  readonly memoryFile: string;
  readonly resume: string | undefined;
  readonly readOnly: boolean;
}, platform: NodeJS.Platform = process.platform): string[] {
  // a reviewer's session has only the tools that read, confined to the worktree
  // connector tools arrive deferred, and ToolSearch is what loads them
  const connector = input.readOnly ? undefined : input.atlassian;
  // skills only with the user's choice, and never for a reviewer
  const plugins = input.readOnly ? [] : input.plugins.filter((dir) => dir !== "");
  // Claude Code runs commands through PowerShell only on Windows
  const shells = platform === "win32" ? ["Bash", "PowerShell"] : ["Bash"];
  const tools = input.readOnly ? "Read,Glob,Grep" : ["Read", "Edit", "Write", "Glob", "Grep", ...shells].join(",") + (connector === undefined ? "" : ",ToolSearch") + (plugins.length === 0 ? "" : ",Skill");
  const allowed = input.readOnly
    ? ["Read(./**)"]
    : ["Read(./**)", "Edit(./**)", "Write(./**)", ...input.commands.flatMap((c) => shells.map((shell) => `${shell}(${c})`)), ...(connector === undefined ? [] : ["ToolSearch", ...atlassianTools(connector.writes, connector.server)]), ...(plugins.length === 0 ? [] : ["Skill"])];
  const args = [
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
    "--permission-mode",
    "dontAsk",
    // Without --strict-mcp-config a folder's own .mcp.json would start its servers;
    // reading no settings source keeps them, and the user's, out (SECURITY.md §8).
    "--setting-sources",
    connector === undefined ? "project" : "",
    "--settings",
    JSON.stringify({ autoMemoryEnabled: false, disableAllHooks: true }),
    // skills come only through the chosen plugins, which bring the built-in ones along (SECURITY.md §8)
    ...(plugins.length === 0 ? ["--disable-slash-commands"] : []),
    // without it the account's connectors join the session; allowed by name only
    ...(connector === undefined ? ["--strict-mcp-config"] : []),
    "--tools",
    tools,
    "--allowedTools",
    allowed.join(" "),
    ...(plugins.length === 0 || input.worktreeSkills.length === 0 ? [] : ["--disallowedTools", ...input.worktreeSkills.map((name) => `Skill(${name})`)]),
    ...plugins.flatMap((dir) => ["--plugin-dir", dir]),
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
        // a call's input is kept only for what a denial shows of it: the command, or a connector's write
        calls.set(text(block.id), { tool, command: text(block.input.command).trim(), input: writeOf(tool) === undefined ? {} : block.input });
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
    const settings = readSettings(resolveDataDirectory());
    let plugins: string[];
    try {
      writeFileSync(memoryFile, input.memory);
      // a connector project runs its MCP servers, so it gets the chosen skills but no plugin
      plugins = input.readOnly ? [] : pluginDirs(settings.extensions, input.own, folder, { plugins: input.atlassian === undefined });
    } catch (error) {
      cleanUp();
      throw error;
    }
    const calls = new Map<string, { tool: string; command: string; input: Json }>();
    const atlassian = input.atlassian && { ...input.atlassian, server: atlassianServer(settings.connectors?.servers) };
    return startProcess(found.path, launchArgs({ commands: input.commands, atlassian, plugins, worktreeSkills: skillNamesIn(input.cwd), memoryFile, resume: input.resume, readOnly: input.readOnly }), {
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
