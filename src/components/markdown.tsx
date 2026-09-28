import type { ReactNode } from "react";

// The markdown an agent writes, drawn as elements and never as HTML: its text
// is untrusted, so nothing in it can become markup, a script or a link.
// Headings, paragraphs, lists, quotes, tables, code, bold and inline code.

type Block =
  | { readonly kind: "heading"; readonly level: number; readonly text: string }
  | { readonly kind: "paragraph"; readonly text: string }
  | { readonly kind: "list"; readonly ordered: boolean; readonly items: readonly string[] }
  | { readonly kind: "quote"; readonly text: string }
  | { readonly kind: "code"; readonly text: string }
  | { readonly kind: "table"; readonly head: readonly string[]; readonly rows: readonly (readonly string[])[] };

const HEADING = /^(#{1,6})\s+(.*)$/;
const ITEM = /^\s*(?:[-*+]|(\d+)[.)])\s+(.*)$/;
const FENCE = /^\s*```/;
const ROW = /^\s*\|.*\|\s*$/;
const RULE = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

const startsBlock = (line: string, next: string | undefined) =>
  HEADING.test(line) || ITEM.test(line) || FENCE.test(line) || line.startsWith(">") || (ROW.test(line) && next !== undefined && RULE.test(next));

function parseMarkdown(text: string): Block[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i += 1;
    } else if (FENCE.test(line)) {
      const body: string[] = [];
      for (i += 1; i < lines.length && !FENCE.test(lines[i]); i += 1) body.push(lines[i]);
      blocks.push({ kind: "code", text: body.join("\n") });
      i += 1;
    } else if (HEADING.test(line)) {
      const [, hashes, rest] = HEADING.exec(line) ?? [];
      blocks.push({ kind: "heading", level: hashes.length, text: rest.trim() });
      i += 1;
    } else if (ROW.test(line) && i + 1 < lines.length && RULE.test(lines[i + 1])) {
      const head = cells(line);
      const rows: string[][] = [];
      for (i += 2; i < lines.length && ROW.test(lines[i]); i += 1) rows.push(cells(lines[i]));
      blocks.push({ kind: "table", head, rows });
    } else if (ITEM.test(line)) {
      const ordered = ITEM.exec(line)?.[1] !== undefined;
      const items: string[] = [];
      for (; i < lines.length && ITEM.test(lines[i]); i += 1) items.push(ITEM.exec(lines[i])?.[2] ?? "");
      blocks.push({ kind: "list", ordered, items });
    } else if (line.startsWith(">")) {
      const body: string[] = [];
      for (; i < lines.length && lines[i].startsWith(">"); i += 1) body.push(lines[i].replace(/^>\s?/, ""));
      blocks.push({ kind: "quote", text: body.join(" ") });
    } else {
      const body: string[] = [];
      for (; i < lines.length && lines[i].trim() !== "" && (body.length === 0 || !startsBlock(lines[i], lines[i + 1])); i += 1) body.push(lines[i].trim());
      blocks.push({ kind: "paragraph", text: body.join(" ") });
    }
  }
  return blocks;
}

const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;

// A link keeps its words only: an agent's text does not get to send the user anywhere.
function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const link = /^\[([^\]]+)\]\([^)\s]+\)$/.exec(part);
    return link === null ? part : link[1];
  });
}

function block(b: Block, key: number): ReactNode {
  switch (b.kind) {
    case "heading":
      return b.level <= 2 ? <h3 key={key}>{inline(b.text)}</h3> : <h4 key={key}>{inline(b.text)}</h4>;
    case "paragraph":
      return <p key={key}>{inline(b.text)}</p>;
    case "quote":
      return <blockquote key={key}>{inline(b.text)}</blockquote>;
    case "code":
      return (
        <pre key={key}>
          <code>{b.text}</code>
        </pre>
      );
    case "list": {
      const items = b.items.map((item, i) => <li key={i}>{inline(item)}</li>);
      return b.ordered ? <ol key={key}>{items}</ol> : <ul key={key}>{items}</ul>;
    }
    case "table":
      return (
        <table key={key}>
          <thead>
            <tr>
              {b.head.map((c, i) => (
                <th key={i}>{inline(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.rows.map((row, r) => (
              <tr key={r}>
                {row.map((c, i) => (
                  <td key={i}>{inline(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
  }
}

export function Markdown({ text }: { readonly text: string }) {
  return <div className="md">{parseMarkdown(text).map(block)}</div>;
}
