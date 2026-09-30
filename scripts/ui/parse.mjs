import { readFileSync } from "node:fs";
import { Script } from "node:vm";

// A page's script only has to parse here; nothing is run.
const PAGES = ["index", "first-run", "office", "projects", "employees", "company", "settings", "plaza", "connect", "components", "characters"];
let bad = 0;
const fail = (m) => { console.log("  ✗ " + m); bad++; };

for (const p of PAGES) {
  const blocks = [...readFileSync(`docs/ui/${p}.html`, "utf8").matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  blocks.forEach((b, i) => {
    try { new Script(b, { filename: `${p}.html#${i}` }); }
    catch (e) { fail(`${p}.html script ${i}: ${e.message}`); }
  });
}
for (const f of ["system.js"]) {
  try { new Script(readFileSync(`docs/ui/${f}`, "utf8"), { filename: f }); }
  catch (e) { fail(`${f}: ${e.message}`); }
}

console.log(bad ? `\n${bad} script(s) do not parse` : "every script parses");
process.exit(bad ? 1 : 0);
