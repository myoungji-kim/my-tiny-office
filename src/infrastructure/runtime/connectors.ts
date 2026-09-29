import { isAtlassianWrite, type AtlassianWrite } from "../../domain/project";

// The Atlassian connector of the user's Claude account, as Claude Code names
// its tools: mcp__<server>__<tool>. The server is this account's, as the
// connector check found it, or the one measured until a check has run. The
// tools were measured against what it offers (SECURITY.md §8): a tool on
// neither list is never allowed.
const MEASURED_SERVER = "claude_ai_Atlassian_Rovo";
const TOOL = /^mcp__([A-Za-z0-9]+(?:_[A-Za-z0-9]+)*)__([A-Za-z0-9_]+)$/;

export const isAtlassianServer = (server: string): boolean => /atlassian/i.test(server);
export const atlassianServer = (servers: readonly string[] | undefined): string => servers?.find(isAtlassianServer) ?? MEASURED_SERVER;

const READS = [
  "atlassianUserInfo",
  "getAccessibleAtlassianResources",
  "search",
  "fetch",
  "getJiraIssue",
  "searchJiraIssuesUsingJql",
  "getVisibleJiraProjects",
  "getJiraProjectIssueTypesMetadata",
  "getJiraIssueTypeMetaWithFields",
  "getTransitionsForJiraIssue",
  "getJiraIssueRemoteIssueLinks",
  "getIssueLinkTypes",
  "lookupJiraAccountId",
  "getConfluenceSpaces",
  "getConfluencePage",
  "getPagesInConfluenceSpace",
  "getConfluencePageDescendants",
  "getConfluencePageFooterComments",
  "getConfluencePageInlineComments",
  "getConfluenceCommentChildren",
  "searchConfluenceUsingCql",
  "getContentFormatGuide",
];

const WRITES: Readonly<Record<AtlassianWrite, readonly string[]>> = {
  jiraComment: ["addCommentToJiraIssue"],
  jiraEdit: ["editJiraIssue"],
  jiraTransition: ["transitionJiraIssue"],
  jiraCreate: ["createJiraIssue"],
  jiraWorklog: ["addWorklogToJiraIssue"],
  jiraLink: ["createIssueLink"],
  confluenceEdit: ["updateConfluencePage"],
  confluenceCreate: ["createConfluencePage"],
  confluenceComment: ["createConfluenceFooterComment", "createConfluenceInlineComment"],
};

// The tools a connector project's session may use: every read, and the writes it allows.
export const atlassianTools = (writes: readonly AtlassianWrite[], server: string): string[] =>
  [...READS, ...writes.flatMap((w) => WRITES[w])].map((t) => `mcp__${server}__${t}`);

export function writeOf(tool: string): AtlassianWrite | undefined {
  const [, server, name] = TOOL.exec(tool) ?? [];
  if (server === undefined || !isAtlassianServer(server)) return undefined;
  const found = Object.entries(WRITES).find(([, tools]) => tools.includes(name))?.[0];
  return isAtlassianWrite(found) ? found : undefined;
}

type Json = Record<string, unknown>;
const text = (value: unknown): string => (typeof value === "string" ? value : "");
const MAX_SHOWN = 4000;

// Where a write would go and what it would say, as the call gives them, for
// the user to read before allowing it. The rest of the call is shown as it is.
export function writeShown(input: Json): { readonly target: string; readonly text: string } {
  const target = text(input.issueIdOrKey) || text(input.pageId) || text(input.projectKey) || text(input.spaceId) || text(input.inwardIssue) || "";
  const said = text(input.commentBody) || text(input.body) || text(input.comment);
  const rest = Object.fromEntries(Object.entries(input).filter(([k]) => !["cloudId", "issueIdOrKey", "pageId", "commentBody", "body", "comment"].includes(k)));
  const shown = [said, Object.keys(rest).length > 0 ? JSON.stringify(rest, null, 2) : ""].filter((s) => s !== "").join("\n\n");
  return { target: target.slice(0, 200), text: shown.length > MAX_SHOWN ? shown.slice(0, MAX_SHOWN) + "…" : shown };
}
