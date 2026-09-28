import { readFileSync } from "node:fs";

const PAGES = ["index", "first-run", "office", "projects", "employees", "company", "settings", "connect", "components", "characters"];
const src = Object.fromEntries(PAGES.map((p) => [p, readFileSync(`docs/ui/${p}.html`, "utf8")]));
const guide = readFileSync("docs/STYLE-GUIDE.md", "utf8");
// The tokens and the cast moved out of the pages, so that is where to read them.
src["system.css"] = readFileSync("docs/ui/system.css", "utf8");
src["system.js"] = readFileSync("docs/ui/system.js", "utf8");
const design = readFileSync("docs/DESIGN.md", "utf8");

let bad = 0;
const fail = (m) => { console.log("✗ " + m); bad++; };

/* every token any page declares, with the page that declares it */
const declared = new Map();
for (const [page, text] of Object.entries(src)) {
  for (const [, k, v] of text.matchAll(/^\s*(--[a-z0-9-]+):\s*([^;]+);/gm)) {
    const value = v.trim();
    const prev = declared.get(k);
    if (prev && prev.value !== value) fail(`${k}: ${prev.page} has ${prev.value}, ${page} has ${value}`);
    if (!prev) declared.set(k, { value, page });
  }
}

/* the guide's token tables must match, both directions */
const documented = [...guide.matchAll(/\| `(--[a-z0-9-]+)`(?: \/ `(--[a-z0-9-]+)`)? \| `([^`]+)`(?: \/ `([^`]+)`)? \|/g)];
let checked = 0;
for (const [, k1, k2, v1, v2] of documented) {
  for (const [k, v] of [[k1, v1], [k2, v2]]) {
    if (!k) continue;
    checked++;
    if (!declared.has(k)) fail(`the guide documents ${k}, which no ui page declares`);
    else if (declared.get(k).value !== v) fail(`${k}: guide says ${v}, ${declared.get(k).page}.html has ${declared.get(k).value}`);
  }
}
for (const [k, { page }] of declared) {
  if (k === "--sans" || k === "--mono") continue;
  if (!guide.includes("`" + k + "`")) fail(`${page}.html declares ${k}, which the guide never mentions`);
}

/* one outline for furniture and characters alike */
const outline = src["system.js"].match(/K: "(#[0-9a-f]{6})"/)?.[1];
if (!outline) fail("system.js has no tile outline colour");
if (outline && !guide.includes(outline)) fail(`outline ${outline} is not in the guide`);
if (outline && !src.characters.includes(outline)) fail("characters.html draws its swatches with a different outline");

/* claims about the cast, which every page now shares */
const species = [...src["system.js"].matchAll(/\{ key: "([a-z]+)", sprite:/g)].map((m) => m[1]);
const families = new Set([...src["system.js"].matchAll(/family: \{ ko: "([^"]+)"/g)].map((m) => m[1]));
if (species.length !== 20) fail(`the guide says twenty species, system.js has ${species.length}`);
if (families.size !== 8) fail(`the guide says eight families, system.js has ${families.size}`);
for (const p of PAGES) {
  if (/\{ key: "[a-z]+", sprite:/.test(src[p])) fail(`${p}.html carries its own copy of the cast`);
}

/* every species a page actually uses must exist */
for (const p of ["office", "employees"]) {
  for (const m of src[p].matchAll(/species: "([a-z]+)"/g)) {
    if (!species.includes(m[1])) fail(`${p}.html uses species "${m[1]}", which the cast does not define`);
  }
}


/* the areas RULES.md names must be the ones the sample page offers */
const rules = readFileSync("docs/RULES.md", "utf8");
const areaLabels = [...src["system.js"].matchAll(/areas: \{([^}]*)\}/g)]
  .map((m) => [...m[1].matchAll(/: "([^"]+)"/g)].map((x) => x[1]));
const english = areaLabels.find((set) => set.every((a) => /^[\x20-\x7e]+$/.test(a)));
if (!english) fail("system.js has no English area labels");
else for (const a of english) {
  if (!rules.includes(a)) fail(`RULES.md does not name the area "${a}"`);
}

/* all four weights, on every page (system.css is not a page) */
for (const page of PAGES) {
  const text = src[page];
  const m = text.match(/Noto\+Sans\+KR:wght@([0-9;]+)/);
  if (!m) fail(`${page}.html does not load Noto Sans KR`);
  else for (const w of ["400", "500", "600", "700"]) {
    if (!m[1].split(";").includes(w)) fail(`${page}.html does not request weight ${w}`);
  }
}

/* the index must link every page, and DESIGN.md must name them */
for (const p of PAGES.filter((p) => p !== "index")) {
  if (!src.index.includes(`href="${p}.html"`)) fail(`index.html does not link ${p}.html`);
  if (!design.includes(`ui/${p}.html`)) fail(`DESIGN.md does not name ui/${p}.html`);
}

/* relative links in DESIGN.md resolve */
for (const m of design.matchAll(/\]\((?!https?:)([^)#]+)\)/g)) {
  const target = m[1].replace(/\/$/, "/README.md");
  try { readFileSync("docs/" + target); } catch { fail(`DESIGN.md links to ${m[1]}, which does not exist`); }
}

console.log(bad ? `\n${bad} problem(s)` : `\n${checked} documented token values match the pages`);
console.log(`${declared.size} tokens across ${PAGES.length} pages · ${species.length} species / ${families.size} families · outline ${outline}`);
process.exit(bad ? 1 : 0);
