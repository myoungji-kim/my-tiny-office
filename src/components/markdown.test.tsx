import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Markdown } from "./markdown";

const html = (text: string) => renderToStaticMarkup(<Markdown text={text} />);

describe("Markdown", () => {
  it("draws what an agent's report uses", () => {
    const report = [
      "## 결과",
      "파일을 **옮기지 않았습니다**. `memory-notes.md`는",
      "루트에 있어요.",
      "",
      "| 기준 | 경로 |",
      "|---|---|",
      "| 루트 | `memory-notes.md` |",
      "",
      "- 하나",
      "- 둘",
      "",
      "```",
      "git merge mto/x",
      "```",
    ].join("\n");

    expect(html(report)).toBe(
      '<div class="md"><h3>결과</h3><p>파일을 <strong>옮기지 않았습니다</strong>. <code>memory-notes.md</code>는 루트에 있어요.</p>' +
        "<table><thead><tr><th>기준</th><th>경로</th></tr></thead><tbody><tr><td>루트</td><td><code>memory-notes.md</code></td></tr></tbody></table>" +
        "<ul><li>하나</li><li>둘</li></ul><pre><code>git merge mto/x</code></pre></div>",
    );
  });

  it("keeps counting a list a code block broke, and the code's own indentation", () => {
    const out = html(["1. first", "   ```ts", "   if (x) {", "     y();", "   }", "   ```", "2. second"].join("\n"));

    expect(out).toContain("<pre><code>if (x) {\n  y();\n}</code></pre>");
    expect(out).toContain('<ol start="2"><li>second</li></ol>');
  });

  it("never lets the text become markup or a link", () => {
    const out = html('<img src=x onerror="alert(1)"> [여기](javascript:alert(1)) <script>x</script>');

    expect(out).not.toContain("<img");
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<a");
    expect(out).toContain("&lt;img");
    expect(out).toContain("여기");
  });
});
