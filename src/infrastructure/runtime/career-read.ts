import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { findExecutable, runProcess } from "../process/run";

import { said } from "./sessions";

// Summing up a session a hire comes from (SECURITY.md §8b): its transcript,
// cut down to what was said, goes to one Claude run that can do nothing but
// answer.

const MAX_TRANSCRIPT = 120_000;
const READ_TIMEOUT_MS = 300_000;
const MAX_LINES = 12;

// Lines that look like a secret never leave the computer in a prompt.
const SECRET = [
  /\b(sk|pk|rk)-[A-Za-z0-9_-]{16,}/,
  /\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{10,}/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bAIza[0-9A-Za-z_-]{30,}/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./,
  /\bBearer\s+[A-Za-z0-9._~+/-]{16,}/i,
  // a key's name may run into others: AWS_SECRET_ACCESS_KEY=, db_password:
  /(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key)\w*["']?\s*[:=]\s*\S+/i,
  // credentials in a URL: postgres://user:pass@host
  /[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]+@/i,
];
// every line of a private key, not only its first
const KEY_BEGIN = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const KEY_END = /-----END [A-Z ]*PRIVATE KEY-----/;

export interface Excerpt {
  readonly text: string;
  readonly dropped: number;
  // its beginning was left out to fit
  readonly cut: boolean;
}

// What the person and Claude said, in order; tool calls, their output and
// Claude Code's own notes are left out.
export function excerpt(transcript: Buffer): Excerpt {
  let dropped = 0;
  const turns: string[] = [];
  for (const { who, text } of said(transcript)) {
    let inKey = false;
    const kept = text.split("\n").filter((l) => {
      if (KEY_BEGIN.test(l)) inKey = true;
      const secret = inKey || SECRET.some((pattern) => pattern.test(l));
      if (KEY_END.test(l)) inKey = false;
      if (secret) dropped += 1;
      return !secret;
    });
    if (kept.length > 0) turns.push(`${who === "user" ? "User" : "Claude"}: ${kept.join("\n")}`);
  }
  const text = turns.join("\n\n");
  const cut = text.length > MAX_TRANSCRIPT;
  return { text: cut ? text.slice(-MAX_TRANSCRIPT) : text, dropped, cut };
}

// No tools, no settings of the user's, no MCP, no slash commands, in an empty
// folder, capped low: it can only read what it is given and answer. A quick
// model without extended thinking: summing up needs no more (SECURITY.md §9).
// --tools takes every word after it, so an option always follows it.
export const readArgs = (): string[] => [
  "-p",
  "--output-format",
  "json",
  "--model",
  "sonnet",
  "--permission-mode",
  "dontAsk",
  "--setting-sources",
  "",
  "--settings",
  JSON.stringify({ autoMemoryEnabled: false, disableAllHooks: true, alwaysThinkingEnabled: false }),
  "--strict-mcp-config",
  "--disable-slash-commands",
  "--tools",
  "",
  "--max-budget-usd",
  "0.5",
];

export interface Area {
  readonly id: string;
  readonly name: string;
}

export const readPrompt = (areas: readonly Area[], conversation: string): string =>
  [
    "Below is a conversation between a developer and Claude Code. Someone who took part in it is joining a team.",
    "Pick out what is worth bringing to other work:",
    `- knows: facts about the code, the domain or the tools that would help on other tasks. Each has one area, by its id, from: ${areas.map((a) => `${a.id} (${a.name})`).join(", ")}.`,
    "- style: how this person wants work done: habits, preferences, rules of thumb.",
    `Each line is one sentence, under 200 characters, in the language the conversation is written in. At most ${MAX_LINES} lines in all. Leave out anything specific to one moment, and anything that looks like a secret, a name or an address.`,
    "If nothing is worth bringing, answer with empty lists.",
    'Answer with JSON only, nothing around it: {"knows":[{"area":"<id>","text":"..."}],"style":["..."]}',
    "",
    "<conversation>",
    conversation,
    "</conversation>",
  ].join("\n");

export interface Proposal {
  readonly knows: readonly { readonly area: string; readonly text: string }[];
  readonly style: readonly string[];
}

const line = (value: unknown): string | undefined => (typeof value === "string" && value.trim() !== "" ? value.trim().slice(0, 200) : undefined);

// The model's answer, kept only where it has the shape asked for and an area
// the company has.
export function proposalIn(stdout: string, areas: readonly Area[]): Proposal | undefined {
  let result: unknown;
  try {
    const outer = JSON.parse(stdout) as Record<string, unknown>;
    if (outer.is_error === true || outer.subtype !== "success") return undefined;
    result = outer.result;
  } catch {
    return undefined;
  }
  if (typeof result !== "string") return undefined;
  const json = result.slice(result.indexOf("{"), result.lastIndexOf("}") + 1);
  let answer: Record<string, unknown>;
  try {
    answer = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return undefined;
  }
  const ids = new Set(areas.map((a) => a.id));
  const knows = (Array.isArray(answer.knows) ? answer.knows : [])
    .map((k) => (typeof k === "object" && k !== null ? (k as Record<string, unknown>) : {}))
    .map((k) => ({ area: typeof k.area === "string" ? k.area : "", text: line(k.text) }))
    .filter((k): k is { area: string; text: string } => ids.has(k.area) && k.text !== undefined);
  const style = (Array.isArray(answer.style) ? answer.style : []).map(line).filter((s): s is string => s !== undefined);
  return { knows: knows.slice(0, MAX_LINES), style: style.slice(0, MAX_LINES) };
}

export type ReadResult = { readonly ok: true; readonly proposal: Proposal; readonly excerpt: Omit<Excerpt, "text"> } | { readonly ok: false };

export async function readCareer(file: string, areas: readonly Area[]): Promise<ReadResult> {
  const claude = findExecutable("claude");
  if (claude.kind !== "found") return { ok: false };
  const cut = excerpt(readFileSync(file));
  const folder = mkdtempSync(join(tmpdir(), "my-tiny-office-read-"));
  try {
    const run = await runProcess(claude.path, readArgs(), { cwd: folder, input: readPrompt(areas, cut.text), timeoutMs: READ_TIMEOUT_MS });
    const proposal = proposalIn(run.stdout, areas);
    return proposal === undefined ? { ok: false } : { ok: true, proposal, excerpt: { dropped: cut.dropped, cut: cut.cut } };
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}
