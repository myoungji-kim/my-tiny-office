// Builds the app and installs it as a desktop app on this computer:
// ~/Applications on macOS, the Start menu on Windows. Run it again to update.

import { spawnSync } from "node:child_process";
import http from "node:http";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { packager } from "@electron/packager";

import { icns, ico, png } from "./icon.mjs";

const NAME = "My Tiny Office";
const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const work = join(here, "build");

const run = (file, args, options = {}) => {
  const result = spawnSync(file, args, { stdio: "inherit", cwd: root, ...options });
  if (result.status !== 0) throw new Error(`${file} ${args.join(" ")} failed`);
};

// Building over the files an open app serves breaks it, and Windows keeps its exe in use.
const open = await new Promise((settle) => {
  const request = http.get("http://127.0.0.1:4317/", (response) => (response.resume(), settle(true)));
  request.on("error", () => settle(false));
  request.setTimeout(2_000, () => request.destroy());
});
if (open) {
  console.error("My Tiny Office is open. Quit it first, then run this again.");
  process.exit(1);
}

console.log("Building the app…");
run(process.execPath, [join(root, "node_modules", "next", "dist", "bin", "next"), "build"]);

// The installed app holds only the window and where this checkout is; the
// server runs from here, so `git pull` and this script are the whole update.
rmSync(work, { recursive: true, force: true });
const stage = join(work, "app");
mkdirSync(stage, { recursive: true });
cpSync(join(here, "main.mjs"), join(stage, "main.mjs"));
writeFileSync(join(stage, "root.json"), JSON.stringify({ root }));
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
writeFileSync(join(stage, "package.json"), JSON.stringify({ name: "my-tiny-office", productName: NAME, version, main: "main.mjs" }));

writeFileSync(join(work, "icon.png"), png(512));
writeFileSync(join(work, "icon.ico"), ico());
writeFileSync(join(work, "icon.icns"), icns());

console.log("Packaging the window…");
const [built] = await packager({
  dir: stage,
  out: join(work, "out"),
  name: NAME,
  platform: process.platform,
  arch: process.arch,
  electronVersion: JSON.parse(readFileSync(join(root, "node_modules", "electron", "package.json"), "utf8")).version,
  icon: join(work, process.platform === "darwin" ? "icon.icns" : process.platform === "win32" ? "icon.ico" : "icon.png"),
  appBundleId: "local.my-tiny-office",
  appCategoryType: "public.app-category.productivity",
  overwrite: true,
  prune: false,
  asar: false,
});

if (process.platform === "darwin") {
  const target = join(homedir(), "Applications", `${NAME}.app`);
  mkdirSync(dirname(target), { recursive: true });
  rmSync(target, { recursive: true, force: true });
  run("/usr/bin/ditto", [join(built, `${NAME}.app`), target]);
  // Packaging changes Electron's bundle, so it is signed again for this computer only.
  run("/usr/bin/codesign", ["--force", "--deep", "--sign", "-", target]);
  console.log(`Installed: ${target}`);
} else if (process.platform === "win32") {
  const target = join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "Programs", NAME);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
  cpSync(built, target, { recursive: true });
  const shortcut = join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "Microsoft", "Windows", "Start Menu", "Programs", `${NAME}.lnk`);
  // the paths go in as environment variables, so nothing in them is read as script
  run(
    join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
    ["-NoProfile", "-NonInteractive", "-Command", "$s = (New-Object -ComObject WScript.Shell).CreateShortcut($env:MTO_LINK); $s.TargetPath = $env:MTO_EXE; $s.WorkingDirectory = $env:MTO_DIR; $s.Save()"],
    { env: { ...process.env, MTO_LINK: shortcut, MTO_EXE: join(target, `${NAME}.exe`), MTO_DIR: target } },
  );
  console.log(`Installed: ${target}\nStart menu: ${NAME}`);
} else {
  console.log(`Built: ${built}`);
}
