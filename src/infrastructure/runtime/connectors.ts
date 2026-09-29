import { isAtlassianWrite, type AtlassianWrite } from "../../domain/project";

// The Atlassian connector of the user's Claude account, as Claude Code names
// its tools. Measured against the tools it offers (SECURITY.md §8): a tool on
// neither list is never allowed.
const ATLASSIAN = "mcp__claude_ai_Atlassian_Rovo__";

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
export const atlassianTools = (writes: readonly AtlassianWrite[]): string[] => [...READS, ...writes.flatMap((w) => WRITES[w])].map((t) => ATLASSIAN + t);

export function writeOf(tool: string): AtlassianWrite | undefined {
  if (!tool.startsWith(ATLASSIAN)) return undefined;
  const name = tool.slice(ATLASSIAN.length);
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
