import { spawnSync } from "node:child_process";

// The sample pages under docs/ui are the UI standard, so they get checked like
// code. Each step prints its own findings and fails the run.
const STEPS = [
  ["parse", "Does every script still parse?"],
  ["audit", "Is the system used the same way everywhere?"],
  ["parity", "Do the product screens agree where they share a selector?"],
  ["verify-docs", "Do the written docs still match the pages?"],
  ["cast", "Does the app draw the cast the pages draw?"],
  ["app-styles", "Does the app style a screen the way its page does?"],
];

let failed = [];
for (const [name, what] of STEPS) {
  console.log(`\n── ${name} — ${what}\n`);
  const r = spawnSync(process.execPath, [`scripts/ui/${name}.mjs`], { stdio: "inherit" });
  if (r.status !== 0) failed.push(name);
}

console.log(failed.length ? `\n${failed.join(", ")} failed` : "\ndocs/ui is consistent");
process.exit(failed.length ? 1 : 0);
