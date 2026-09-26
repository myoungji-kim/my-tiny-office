import { readFileSync } from "node:fs";

// Rules that moved into system.css are one copy already; prepending it lets
// the comparison keep working on whatever a page still defines itself.
const SYSTEM = readFileSync("docs/ui/system.css", "utf8");
const page = (n) => SYSTEM + "\n" + readFileSync("docs/ui/" + n + ".html", "utf8");
const components = page("components");
const index = page("index");
const office = page("office");
const employees = page("employees");
const connect = page("connect");
const firstRun = page("first-run");

const rule = (src, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = src.match(new RegExp("^[ \\t]*" + escaped + "\\s*\\{([^}]*)\\}", "m"));
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
};

// index.html carries its own copy of these, so they must not drift apart
const normalise = (v) =>
  v
    .replace(/margin-bottom:\s*20px;?/, "")
    .replace(/var\(--r-card,\s*12px\)/g, "var(--r-card)")
    .replace(/\s+/g, " ")
    .trim();

let bad = 0;
const check = (label, pairs) => {
  for (const [selector, a, b, an, bn] of pairs) {
    const ra = rule(a, selector);
    const rb = rule(b, selector);
    if (!ra) { console.log(`✗ ${an} has no ${selector}`); bad++; continue; }
    if (!rb) { console.log(`✗ ${bn} has no ${selector}`); bad++; continue; }
    if (normalise(ra) !== normalise(rb)) {
      console.log(`✗ ${selector} differs between ${an} and ${bn}\n    ${an}: ${ra}\n    ${bn}: ${rb}`);
      bad++;
    }
  }
  console.log(`${label}: ${pairs.length} rule(s) compared`);
};

check(
  "notice (components ↔ index)",
  [".notice", ".n-ic", ".n-tx", ".n-acts"].map((s) => [s, components, index, "components.html", "index.html"]),
);

check(
  "buttons (components ↔ office)",
  [".btn", ".btn-sm", ".btn-secondary"].map((s) => [s, components, office, "components.html", "office.html"]),
);

check(
  "menu rows (components ↔ office)",
  [".mrow", ".mrow-key", ".mrow-bad"].map((s) => [s, components, office, "components.html", "office.html"]),
);

check(
  "buttons (components ↔ employees)",
  [".btn", ".btn-sm", ".btn-md", ".btn-primary", ".btn-secondary"].map((x) => [x, components, employees, "components.html", "employees.html"]),
);

check(
  "notice (components ↔ employees)",
  [".notice", ".n-ic", ".n-tx", ".n-acts"].map((x) => [x, components, employees, "components.html", "employees.html"]),
);

check(
  "modal (components ↔ employees)",
  [".scrim", ".modal", ".m-hd", ".m-sec", ".m-foot", ".pick", ".radio"].map((x) => [x, components, employees, "components.html", "employees.html"]),
);

check(
  "modal parts (employees ↔ connect)",
  [".m-hd", ".m-sec", ".m-foot", ".pick", ".radio", ".pick-t"].map((x) => [x, employees, connect, "employees.html", "connect.html"]),
);

check(
  "notice (components ↔ first-run)",
  [".notice", ".n-ic", ".n-tx", ".n-acts"].map((x) => [x, components, firstRun, "components.html", "first-run.html"]),
);

// the popover width the guide quotes has to be the one both pages use
const width = (src) => rule(src, ".pop")?.match(/width:\s*(\d+px)/)?.[1];
if (width(components) !== width(office)) {
  console.log(`✗ popover width: components.html ${width(components)}, office.html ${width(office)}`);
  bad++;
}

console.log(bad ? `\n${bad} parity problem(s)` : `\nno drift between the pages`);
process.exit(bad ? 1 : 0);
