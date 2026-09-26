import { readFileSync } from "node:fs";

// Everything the pages once kept their own copy of now lives in system.css.
// `.notice` is the exception: it has two variants, so five pages still define
// it themselves, and audit rule 1 waves padding and margin through on purpose.
// This is what is left to compare.
const PAGES = ["components", "index", "employees", "connect", "first-run"];
const SELECTORS = [".notice"];

const styleOf = (p) =>
  (readFileSync(`docs/ui/${p}.html`, "utf8").match(/<style>([\s\S]*?)<\/style>/) ?? [, ""])[1];
const css = Object.fromEntries(PAGES.map((p) => [p, styleOf(p)]));

const rule = (text, selector) => {
  const at = text.indexOf("\n  " + selector + " {");
  if (at === -1) return null;
  const open = text.indexOf("{", at);
  return text.slice(open + 1, text.indexOf("}", open)).replace(/\s+/g, " ").trim();
};

let bad = 0;
const fail = (m) => { console.log("✗ " + m); bad++; };

for (const selector of SELECTORS) {
  const [reference, ...rest] = PAGES;
  const base = rule(css[reference], selector);
  if (base === null) { fail(`${reference}.html has no ${selector}`); continue; }

  for (const p of rest) {
    const here = rule(css[p], selector);
    if (here === null) fail(`${p}.html has no ${selector}`);
    else if (here !== base) {
      fail(`${selector} differs\n    ${reference}.html: ${base}\n    ${p}.html: ${here}`);
    }
  }
  console.log(`${selector}: the same on ${PAGES.length} pages`);
}

console.log(bad ? `\n${bad} parity problem(s)` : "\nno drift between the pages");
process.exit(bad ? 1 : 0);
