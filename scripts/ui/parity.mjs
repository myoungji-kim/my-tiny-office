import { readFileSync } from "node:fs";

// Whatever a page still defines itself may also be defined by another page,
// and then the two have to agree. The list is derived rather than written
// down, so it shrinks on its own as components move into system.css.
//
// audit rule 1 makes the same comparison but waives padding, margin, width and
// height, so that pages may space things differently. This is the pass that
// does not waive them: a component's own box is part of the component.
// Only the product screens: they are one application in one shell, so a
// selector they share is the same component in the same context. A landing
// page and an onboarding step legitimately size a logo differently, and
// comparing across them would report the system working as a fault. With the
// shared rules in system.css it usually finds nothing to compare; it is the
// guard for the day a page defines a component of its own again.
const PAGES = ["office", "projects", "employees", "company", "settings"];

const styleOf = (p) =>
  (readFileSync(`docs/ui/${p}.html`, "utf8").match(/<style>([\s\S]*?)<\/style>/) ?? [, ""])[1];

const stripMedia = (css) => {
  let out = "";
  for (let i = 0; i < css.length; ) {
    const at = css.indexOf("@media", i);
    if (at === -1) { out += css.slice(i); break; }
    out += css.slice(i, at);
    let depth = 0, j = css.indexOf("{", at);
    for (; j < css.length; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}" && --depth === 0) { j++; break; }
    }
    i = j;
  }
  return out;
};

const rules = new Map(); // selector -> Map(declaration -> [pages])
for (const p of PAGES) {
  for (const m of stripMedia(styleOf(p)).matchAll(/(^|\n)\s*([.#][a-zA-Z][^{}\n]*?)\s*\{([^}]*)\}/g)) {
    const sel = m[2].trim();
    const decl = m[3].replace(/\s+/g, " ").trim().replace(/;$/, "");
    if (!rules.has(sel)) rules.set(sel, new Map());
    const v = rules.get(sel);
    if (!v.has(decl)) v.set(decl, []);
    v.get(decl).push(p);
  }
}

let bad = 0;
let compared = 0;
for (const [sel, variants] of rules) {
  const pages = [...variants.values()].flat();
  if (pages.length < 2) continue;
  compared++;
  if (variants.size === 1) continue;
  bad++;
  console.log(`✗ ${sel} differs`);
  for (const [decl, where] of variants) console.log(`    ${where.join(", ")}: ${decl}`);
}

console.log(`\n${compared} selector(s) live on more than one page`);
console.log(bad ? `${bad} of them disagree` : "none of them disagree");
process.exit(bad ? 1 : 0);
