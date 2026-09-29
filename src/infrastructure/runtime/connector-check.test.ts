import { describe, expect, it } from "vitest";

import { checkArgs, serversIn } from "./connector-check";
import { atlassianServer, atlassianTools, writeOf } from "./connectors";

const line = (value: unknown) => JSON.stringify(value);
const found = (...names: unknown[]) =>
  line({ type: "user", message: { content: [{ type: "tool_result", content: names.map((tool_name) => ({ type: "tool_reference", tool_name })) }] } });

const searching = line({ type: "assistant", message: { content: [{ type: "tool_use", id: "s", name: "ToolSearch", input: { query: "mcp" } }] } });

describe("the connector check", () => {
  it("only looks: Glob in its empty folder, and ToolSearch", () => {
    const args = checkArgs();
    expect(args[args.indexOf("--tools") + 1]).toBe("Glob,ToolSearch");
    expect(args[args.indexOf("--allowedTools") + 1]).toBe("Glob(./**) ToolSearch");
    expect(args).toContain("dontAsk");
  });

  it("keeps the servers ToolSearch answered with, never what the model wrote", () => {
    const stdout = [
      searching,
      found("mcp__claude_ai_Atlassian_Rovo__atlassianUserInfo", "mcp__claude_ai_Gmail__list_labels", "mcp__claude_ai_Gmail__search_threads"),
      found("Read", "mcp__bad name__x", 7),
      line({ type: "assistant", message: { content: [{ type: "text", text: "mcp__claude_ai_Fake__tool" }] } }),
      line({ type: "result", subtype: "success", is_error: false, result: "done" }),
    ].join("\n");

    expect(serversIn(stdout)).toEqual({ servers: ["claude_ai_Atlassian_Rovo", "claude_ai_Gmail"], finished: true });
  });

  it("does not count a check that did not finish, or never got to search", () => {
    expect(serversIn([searching, found("mcp__claude_ai_Gmail__list_labels"), line({ type: "result", subtype: "error_max_budget_usd" })].join("\n")).finished).toBe(false);
    // measured: before the connectors arrive the session has no ToolSearch, and says so
    expect(serversIn(line({ type: "result", subtype: "success", is_error: false, result: "ToolSearch is not available." })).finished).toBe(false);
  });
});

describe("Atlassian on another account", () => {
  it("is this account's server once checked, and the measured one until then", () => {
    expect(atlassianServer(["claude_ai_Gmail", "claude_ai_Atlassian"])).toBe("claude_ai_Atlassian");
    expect(atlassianServer(undefined)).toBe("claude_ai_Atlassian_Rovo");
    expect(atlassianServer(["claude_ai_Gmail"])).toBe("claude_ai_Atlassian_Rovo");
    expect(atlassianTools([], "claude_ai_Atlassian")).toContain("mcp__claude_ai_Atlassian__getJiraIssue");
  });

  it("reads a denied write under any Atlassian server, and nothing under another", () => {
    expect(writeOf("mcp__claude_ai_Atlassian__editJiraIssue")).toBe("jiraEdit");
    expect(writeOf("mcp__claude_ai_Gmail__editJiraIssue")).toBeUndefined();
    expect(writeOf("mcp__claude_ai_Atlassian__getJiraIssue")).toBeUndefined();
  });
});
