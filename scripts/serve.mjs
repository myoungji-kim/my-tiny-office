// `npm run dev` and `npm start`: the server gets a token of its own for this
// launch, and the terminal gets the address that carries it (SECURITY.md §6).
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const [mode, ...rest] = process.argv.slice(2);
if (mode !== "dev" && mode !== "start") {
  console.error("usage: node scripts/serve.mjs dev|start [next options]");
  process.exit(2);
}

const token = randomBytes(32).toString("hex");
const portAt = rest.findIndex((a) => a === "-p" || a === "--port");
const port = portAt >= 0 ? rest[portAt + 1] : (process.env.PORT ?? "3000");
const address = `http://127.0.0.1:${port}/?token=${token}`;

const next = spawn(process.execPath, [join(root, "node_modules", "next", "dist", "bin", "next"), mode, "-H", "127.0.0.1", ...rest], {
  cwd: root,
  env: { ...process.env, MY_TINY_OFFICE_TOKEN: token },
  stdio: ["inherit", "pipe", "inherit"],
});

// Next prints an address of its own, which the server refuses; this one comes
// after it, once the server is ready, so it is the one in view.
let told = false;
next.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  if (told || !/Ready in/.test(String(chunk))) return;
  told = true;
  process.stdout.write(`\n  Open My Tiny Office: ${address}\n\n`);
});
next.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => next.kill(signal));
