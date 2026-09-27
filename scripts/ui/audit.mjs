import { existsSync, readFileSync } from "node:fs";

const PAGES = ["index", "first-run", "office", "projects", "employees", "connect", "components", "characters"];
const src = Object.fromEntries(PAGES.map((p) => [p, readFileSync(`docs/ui/${p}.html`, "utf8")]));

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
// A page is styled by system.css plus its own block, in that order, so every
// rule check has to look at both.
const SYSTEM = readFileSync("docs/ui/system.css", "utf8");
const styleOf = (s) => stripMedia(SYSTEM + "\n" + (s.match(/<style>([\s\S]*?)<\/style>/) ?? [, ""])[1]);

// selector -> { page -> normalised declaration }
const rules = {};
for (const [page, text] of Object.entries(src)) {
  for (const m of styleOf(text).matchAll(/(^|\n)\s*([.#][a-zA-Z][^{}\n]*?)\s*\{([^}]*)\}/g)) {
    const sel = m[2].trim();
    if (sel.startsWith("#") || sel.includes("@")) continue;
    const decl = m[3].replace(/\s+/g, " ").trim().replace(/;$/, "");
    (rules[sel] ??= {})[page] = decl;
  }
}

let problems = 0;
const flag = (msg) => { console.log("  ✗ " + msg); problems++; };

/* ── 1. every selector defined on more than one page must agree ── */
console.log("shared selectors");
let shared = 0;
const IGNORE_DECL = /^(width|max-width|height|margin|margin-top|margin-bottom|grid-template-columns|position|top|left|right|bottom|padding)$/;
for (const [sel, byPage] of Object.entries(rules)) {
  const pages = Object.keys(byPage);
  if (pages.length < 2) continue;
  if (sel === ".logo") continue; // sized per surface; radius scales with the box
  shared++;
  const norm = (d) =>
    d
      .split(";")
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((x) => !IGNORE_DECL.test(x.split(":")[0].trim()))
      .sort()
      .join("; ");
  const first = norm(byPage[pages[0]]);
  const odd = pages.filter((p) => norm(byPage[p]) !== first);
  if (odd.length) {
    flag(`${sel} differs: ${pages.map((p) => p).join(" / ")}`);
    for (const p of pages) console.log(`      ${p.padEnd(12)} ${norm(byPage[p]).slice(0, 150)}`);
  }
}
console.log(`  ${shared} selectors defined on more than one page\n`);

/* ── 2. no raw colour outside :root ── */
console.log("raw colours outside the token block");
for (const [page, text] of Object.entries(src)) {
  const css = styleOf(text);
  const root = (css.match(/:root\s*\{[^}]*\}/) ?? [""])[0];
  const body = css.replace(root, "");
  const raw = [...body.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
  const allowed = new Set(["#fff", "#ffffff", "#17171c", "#2a2a31"]);
  const bad = [...new Set(raw)].filter((c) => !allowed.has(c.toLowerCase()));
  if (bad.length) flag(`${page}.html uses ${bad.join(" ")} outside :root`);
}
console.log("");

/* ── 3. button sizes must match the standard ── */
console.log("button sizes");
const SIZES = { "btn-lg": "42px", "btn-md": "36px", "btn-sm": "30px" };
for (const [cls, h] of Object.entries(SIZES)) {
  for (const [sel, byPage] of Object.entries(rules)) {
    if (sel !== "." + cls) continue;
    for (const [page, decl] of Object.entries(byPage)) {
      const got = decl.match(/height:\s*([\d.]+px)/)?.[1];
      if (got && got !== h) flag(`${page}.html .${cls} is ${got}, standard is ${h}`);
    }
  }
}
console.log("");

/* ── 4. radius values must come from the documented set ── */
console.log("radius values");
const OK_RADIUS = new Set(["999px", "18px", "16px", "14px", "13px", "12px", "11px", "10px", "9px", "8px", "7px", "6px", "5px", "2px", "1px", "0"]);
for (const [page, text] of Object.entries(src)) {
  const css = styleOf(text).replace(/:root\s*\{[^}]*\}/, "");
  for (const m of css.matchAll(/border-radius:\s*([^;}]+)/g)) {
    for (const v of m[1].split(/\s+/)) {
      const t = v.trim();
      if (!t || t.startsWith("var(") || OK_RADIUS.has(t)) continue;
      flag(`${page}.html has border-radius ${t}`);
    }
  }
}
console.log("");

/* ── 5. focus must never be removed, and must exist ── */
console.log("focus");
for (const [page, text] of Object.entries(src)) {
  const css = styleOf(text);
  if (/outline:\s*(none|0)/.test(css)) flag(`${page}.html removes an outline`);
  const interactive = /<button|<a |tabindex|<input|<select/.test(text);
  if (interactive && !css.includes(":focus-visible")) flag(`${page}.html has controls but no :focus-visible`);
}
console.log("");

/* ── 6. Korean must never be tracked or uppercased ── */
console.log("korean typography");
for (const [page, text] of Object.entries(src)) {
  const css = styleOf(text);
  for (const m of css.matchAll(/(^|\n)\s*([^{}\n]+)\{([^}]*)\}/g)) {
    const decl = m[3];
    // Negative tracking optically tightens a large heading; it does not pull
    // jamo apart. Positive tracking on Hangul does.
    if (!/letter-spacing:\s*[^-\s]|text-transform:\s*uppercase/.test(decl)) continue;
    const sel = m[2].trim();
    // a Latin wordmark may be tracked; nothing else
    if (/wordmark|side-name|exlabel|\bh1\b|\.k\b|c-k|dr-k|mono/.test(sel)) continue;
    flag(`${page}.html tracks or uppercases: ${sel} { ${decl.trim().slice(0, 60)} }`);
  }
}

/* ── 7. a class in the markup with no rule, and the reverse ── */
// Renaming a selector without renaming the class attribute silently strips a
// component of every declaration it had. That is how the confirm dialog lost
// its spacing.
console.log("orphaned classes");
for (const [page, text] of Object.entries(src)) {
  const css = styleOf(text);
  const body = text.slice(text.indexOf("</style>"));

  const defined = new Set();
  for (const m of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) defined.add(m[1]);

  const used = new Set();
  // A class attribute often carries a template expression. Drop the expression
  // and keep the literal names around it.
  const literals = (v) =>
    v
      .replace(/\${[^}]*}/g, " ")
      .split(/\s+/)
      .filter((c) => /^[a-zA-Z][\w-]*$/.test(c));
  for (const m of body.matchAll(/class="([^"]*)"/g)) for (const c of literals(m[1])) used.add(c);
  for (const m of body.matchAll(/className = "([^"]*)"/g)) for (const c of literals(m[1])) used.add(c);

  // a class the markup asks for that no rule answers
  for (const c of used) {
    if (defined.has(c)) continue;
    if (c.startsWith("js-")) continue; // a hook for script, not a style
    flag(`${page}.html uses .${c} in markup, but no rule defines it`);
  }
}
console.log("");

/* ── 8. the app shell is one component ── */
// The product screens are one application. Building its shell by hand on each
// of them is how one ended up with a different line-height, and how a company
// rename reached two of the three.
console.log("app shell");
{
  const SCREENS = ["office", "projects", "employees"];

  const region = (text, open, close) => {
    const i = text.indexOf(open);
    if (i === -1) return null;
    const j = text.indexOf(close, i);
    return text.slice(i, j + close.length);
  };
  const lines = (html) =>
    html
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      // which item is current and where its links point are allowed to differ
      .map((l) => l.replace(/ aria-current="page"/g, "").replace(/href="[^"]*"/g, 'href=""'));

  // The header carries per-page words, so compare its bones: tags and classes,
  // with text, icons and every other attribute removed.
  const bones = (html) =>
    html
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<svg[\s\S]*?<\/svg>/g, "<svg/>")
      .replace(/>[^<]*</g, "><")
      .replace(/\s+(?!class=)[\w:-]+="[^"]*"/g, "")
      .replace(/\s+/g, "")
      .split(/(?=<)/)
      .filter(Boolean);

  const compare = (what, aName, A, bName, B) => {
    if (!A.length || !B.length) return flag(`${what}: one of ${aName} and ${bName} has none`);
    for (let i = 0; i < Math.max(A.length, B.length); i++) {
      if (A[i] !== B[i]) {
        flag(`${what} differs at ${i}\n      ${aName.padEnd(9)}: ${(A[i] ?? "(none)").slice(0, 84)}\n      ${bName.padEnd(9)}: ${(B[i] ?? "(none)").slice(0, 84)}`);
        break; // one report per pair: past a divergence the rest is noise
      }
    }
  };

  // Which actions and tabs a screen offers is its own business; that they all
  // build the same frame around them is not.
  const opaque = (html) =>
    html
      .replace(/(<div class="head-right">)[\s\S]*?(<\/div>)/, "$1…$2")
      .replace(/(<div class="tabs"[^>]*>)[\s\S]*?(<\/div>)/, "$1…$2");

  const side = (p) => region(src[p], '<nav class="side">', "</nav>");
  const head = (p) => region(src[p], '<div class="head">', '</div>\n    </div>');

  const [first, ...rest] = SCREENS;
  for (const p of rest) {
    compare("sidebar", first, lines(side(first) ?? ""), p, lines(side(p) ?? ""));
    compare("header frame", first, bones(opaque(head(first) ?? "")), p, bones(opaque(head(p) ?? "")));
  }
}
console.log("");

/* ── 9. the shared files are the only copy ── */
// Centralising only helps while the pages stay out of it. A selector or a
// declaration that exists in both places is a second copy again, and the
// page's copy is the one that wins.
console.log("one copy only");
{
  const SYSTEM_JS = readFileSync("docs/ui/system.js", "utf8");
  const sharedSels = new Set([...stripMedia(SYSTEM).matchAll(/(^|\n)([.#:a-zA-Z][^{}\n]*?)\s*\{/g)].map((m) => m[2].trim()));
  const sharedNames = new Set([...SYSTEM_JS.matchAll(/^(?:const|let|function) ([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]));
  const sharedWords = new Set(
    [...(SYSTEM_JS.match(/const WORDS = \{\n  ko: \{([\s\S]*?)\n  \},/) ?? [, ""])[1].matchAll(/^    ([a-zA-Z]+): \{/gm)].map((m) => m[1]),
  );

  for (const p of PAGES) {
    const text = src[p];
    if (!text.includes('href="system.css"')) flag(`${p} does not link system.css`);
    if (!text.includes('src="system.js"')) flag(`${p} does not load system.js`);

    // The pages are meant to be opened straight from disk. A module script or
    // a fetch would be blocked there, so the shared file stays a plain script.
    if (/<script[^>]*type="module"/.test(text)) flag(`${p} uses a module script, which will not run from disk`);
    if (/\bfetch\(/.test(text)) flag(`${p} fetches, which will not work from disk`);

    const css = stripMedia((text.match(/<style>([\s\S]*?)<\/style>/) ?? [, ""])[1]);
    for (const m of css.matchAll(/(^|\n)\s*([.#:a-zA-Z][^{}\n]*?)\s*\{/g)) {
      if (sharedSels.has(m[2].trim())) flag(`${p} redefines ${m[2].trim()}, which system.css already defines`);
    }
    if (/^\s*--[\w-]+\s*:/m.test(css)) flag(`${p} declares a token of its own; the token block is shared`);

    for (const m of text.matchAll(/^  (?:const|let|function) ([A-Za-z_$][\w$]*)/gm)) {
      if (sharedNames.has(m[1])) flag(`${p} redeclares ${m[1]}, which system.js already declares`);
    }
    // The menu, the statuses, the areas and the teams are the same words on
    // every screen that shows them, so a page may not spell them again.
    for (const m of text.matchAll(/^      ([a-zA-Z]+): \{/gm)) {
      if (sharedWords.has(m[1])) flag(`${p} spells ${m[1]} itself, which WORDS already spells`);
    }
    if (text.includes('<nav class="devbar"')) flag(`${p} still carries the sample bar in its markup`);
  }

  // Tokens may be left out where unused, but must never disagree in value.
  const tokensOf = (s) => {
    const root = (s.match(/:root\s*\{([^}]*)\}/) ?? [, ""])[1];
    return new Map([...root.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
  };
  const T = tokensOf(SYSTEM);
  if (T.size < 40) flag(`system.css declares only ${T.size} tokens`);
}
console.log("");


/* ── 10. every element a script reaches for must exist ── */
// A missing id throws, and nothing after it in that block runs -- which is how
// the front door silently lost its language toggle.
console.log("script targets");
for (const p of PAGES) {
  const text = src[p];
  const ids = new Set([...text.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const wanted = new Set([
    ...[...text.matchAll(/getElementById\("([^"]+)"\)/g)].map((m) => m[1]),
    ...[...text.matchAll(/querySelector\("#([\w-]+)"\)/g)].map((m) => m[1]),
  ]);
  for (const id of wanted) if (!ids.has(id)) flag(`${p}: the script looks up #${id}, which the page does not have`);
}
console.log("");

/* ── 11. the tab title is the page's own name ── */
// The bar already names every page in English. Anything else in the title is a
// second name for the same thing, which is how one page kept a draft's name.
console.log("page titles");
{
  const bar = readFileSync("docs/ui/system.js", "utf8");
  const names = new Map([["index", "Design System"]]);
  for (const m of bar.matchAll(/\["([\w-]+)", "[^"]+", "([^"]+)"\]/g)) names.set(m[1], m[2]);
  for (const p of PAGES) {
    const title = (src[p].match(/<title>([^<]*)<\/title>/) ?? [, ""])[1];
    const want = `Tiny Office · ${names.get(p) ?? "?"}`;
    if (title !== want) flag(`${p}: the title says "${title}", the bar calls it "${want}"`);
  }
}
console.log("");


/* ── 13. a page with a dictionary must go through it ── */
// The bug this exists for reads the same way every time: one branch of a
// template with Korean written into it while its siblings call t(). The page
// then reads half-English with the toggle on English.
console.log("korean past the dictionary");
for (const p of PAGES) {
  const text = src[p];
  const dictionaryAt = text.indexOf("const TEXT = {");
  if (dictionaryAt === -1) continue;

  const end = text.indexOf("\n  };", dictionaryAt);
  const outside = text.slice(0, dictionaryAt) + text.slice(end);

  for (const block of outside.matchAll(/<script>[\s\S]*?<\/script>/g)) {
    for (const line of block[0].split("\n")) {
      // a ko/en pair, a player-written nickname and a line that already
      // branches on the language are all doing the right thing
      const code = line
        .replace(/\/\/.*$/, "")
        .replace(/\b"?ko"?:\s*"[^"]*"/g, "")
        .replace(/data-ko="[^"]*"/g, "")
        .replace(/aria-label="[^"]*"/g, "")
        .replace(/\bname:\s*"[^"]*"/g, "");
      if (/lang ===|lang ==/.test(code)) continue;
      if (/[\uac00-\ud7a3]/.test(code)) {
        flag(`${p}: Korean written past the dictionary\n      ${line.trim().slice(0, 88)}`);
      }
    }
  }
}
console.log("");

/* ── 14. a class the shared code builds is styled in the shared file ── */
// system.js writes markup; if the class it writes is styled inside one page,
// every other page gets the markup without the look. That is how the roster
// arrived on two screens as bare buttons, and the popover as nothing at all.
console.log("shared markup, shared styling");
{
  const SYSTEM_JS = readFileSync("docs/ui/system.js", "utf8");
  const shared = new Set([...stripMedia(SYSTEM).matchAll(/(^|\n)([.#:a-zA-Z][^{}\n]*?)\s*\{/g)].map((m) => m[2].trim()));
  const styledSomewhere = (cls) =>
    [...shared].some((sel) => sel.split(/[\s,>]+/).some((part) => part.split(":")[0] === "." + cls));

  const named = new Set();
  // className = "x" and className = "x" + … , plus class="x" inside a template
  for (const m of SYSTEM_JS.matchAll(/className\s*=\s*"([a-z][\w -]*)"/g)) named.add(m[1]);
  for (const m of SYSTEM_JS.matchAll(/class="([a-z][\w -]*)"/g)) named.add(m[1]);

  for (const value of named) {
    for (const cls of value.split(/\s+/).filter(Boolean)) {
      if (!styledSomewhere(cls)) flag(`system.js writes .${cls}, which system.css does not style`);
    }
  }
}
console.log("");


/* ── 15. the menu goes to the screen it names ── */
// A place with a screen must be reachable from every other screen. An href of
// "#" is only for the page you are already on, and for a place not built yet.
console.log("the menu goes somewhere");
{
  const SCREENS = ["office", "projects", "employees"];
  const TARGET = { office: "office.html", projects: "projects.html", people: "employees.html", company: "company.html", settings: "settings.html" };

  for (const p of SCREENS) {
    for (const m of src[p].matchAll(/<a ([^>]*)>([\s\S]*?)<\/a>/g)) {
      const place = m[2].match(/data-t="nav\.([a-z]+)"/)?.[1];
      if (!place) continue;
      const target = TARGET[place];
      if (!target || !existsSync(`docs/ui/${target}`)) continue;
      if (m[1].includes("aria-current")) continue;
      const href = m[1].match(/href="([^"]*)"/)?.[1];
      if (href !== target) flag(`${p}: the menu's ${place} goes to ${href}, not ${target}`);
    }
  }
}
console.log("");


console.log(problems ? `\n${problems} problem(s)` : "\nno inconsistency found");
process.exit(problems ? 1 : 0);
