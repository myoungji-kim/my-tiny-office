import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// A screen's own styles live in its sample page. When the app needs them, it
// carries them in a CSS file that names the page on its first line; every rule
// there must match that page's rule for the same selector, declaration for
// declaration. Rules under a scoped selector (".wizard h1" for the page's
// bare "h1") are compared with the page's unscoped rule.

const rulesOf = (css) => {
  const rules = new Map();
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const selector = m[1].trim().replace(/\s+/g, " ");
    const body = m[2].replace(/\s+/g, " ").trim().replace(/;$/, "");
    rules.set(selector, body);
  }
  return rules;
};

let bad = 0;
let compared = 0;
const dir = "src/app";
for (const file of readdirSync(dir).filter((f) => f.endsWith(".css"))) {
  const css = readFileSync(join(dir, file), "utf8");
  const page = /^\/\* from docs\/ui\/([\w-]+\.html)/.exec(css)?.[1];
  if (page === undefined) continue;
  const html = readFileSync(join("docs/ui", page), "utf8");
  const pageRules = rulesOf((html.match(/<style>([\s\S]*?)<\/style>/) ?? [, ""])[1]);
  for (const [selector, body] of rulesOf(css)) {
    compared++;
    const own = pageRules.get(selector) ?? pageRules.get(selector.replace(/^\.\w[\w-]* (?=[a-z]+\d?$)/, ""));
    if (own === undefined) {
      console.log(`  ✗ ${file}: "${selector}" is not a rule of ${page}`);
      bad++;
    } else if (own !== body) {
      console.log(`  ✗ ${file}: "${selector}" differs from ${page}\n      page: ${own}\n      app:  ${body}`);
      bad++;
    }
  }
}
console.log(`${compared} rule(s) the app carries from the sample pages`);
console.log(bad ? `${bad} of them differ` : "all of them match");
process.exit(bad ? 1 : 0);
