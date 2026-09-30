// The desktop app is a window onto the app's own local server: it starts
// `next start` with the computer's Node, shows it, and stops it on quit.
// Nothing here reaches the server's code or data; the window is a browser tab
// that can go nowhere else (docs/SECURITY.md §6).

import { execFileSync, spawn, spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, mkdirSync, openSync, readFileSync, statSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { delimiter, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { app, BrowserWindow, dialog, session, shell } from "electron";

const here = dirname(fileURLToPath(import.meta.url));

// Installed, the app carries only where the checkout is; run from the checkout, it is right here.
const ROOT = (() => {
  try {
    return JSON.parse(readFileSync(join(here, "root.json"), "utf8")).root;
  } catch {
    return resolve(here, "..");
  }
})();

const PORT = 4317;
const READY_TIMEOUT_MS = 90_000;

const WORDS = {
  ko: {
    opening: "사무실 여는 중…",
    noNode: "Node.js를 찾을 수 없어요. Node.js 22 이상을 설치한 뒤 다시 열어 주세요.",
    notBuilt: "앱이 아직 빌드되지 않았어요. 설치한 폴더에서 `npm run build`를 실행한 뒤 다시 열어 주세요.",
    failed: "사무실을 열지 못했어요. 기록을 확인해 주세요:",
  },
  en: {
    opening: "Opening the office…",
    noNode: "Node.js could not be found. Install Node.js 22 or later, then open the app again.",
    notBuilt: "The app has not been built yet. Run `npm run build` in its folder, then open it again.",
    failed: "The office could not open. See the log:",
  },
};
const words = () => (app.getLocale().startsWith("ko") ? WORDS.ko : WORDS.en);

// An app opened from the Dock or Finder gets a bare PATH, without what the
// user's shell adds (Homebrew, nvm, ~/.local/bin), so node, git and claude go
// missing. The login shell says what the PATH really is.
function userPath() {
  if (process.platform !== "darwin") return process.env.PATH ?? "";
  try {
    const shellPath = process.env.SHELL && isAbsolute(process.env.SHELL) ? process.env.SHELL : "/bin/zsh";
    const printed = execFileSync(shellPath, ["-ilc", 'printf "\\n%s" "$PATH"'], { encoding: "utf8", timeout: 10_000 });
    return printed.split("\n").at(-1) || process.env.PATH || "";
  } catch {
    return process.env.PATH ?? "";
  }
}

function findNode(path) {
  const name = process.platform === "win32" ? "node.exe" : "node";
  for (const dir of path.split(delimiter)) {
    if (dir === "" || !isAbsolute(dir)) continue;
    const candidate = join(dir, name);
    try {
      if (!statSync(candidate).isFile()) continue;
      if (process.platform !== "win32") accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // not here
    }
  }
  return undefined;
}

const portFree = (port) =>
  new Promise((settle) => {
    const probe = net.createServer();
    probe.once("error", () => settle(false));
    probe.listen(port, "127.0.0.1", () => probe.close(() => settle(true)));
  });

// The same port each time keeps what the window remembers (its width, the task split).
async function choosePort() {
  if (await portFree(PORT)) return PORT;
  return new Promise((settle) => {
    const probe = net.createServer();
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => settle(port));
    });
  });
}

const answers = (url) =>
  new Promise((settle) => {
    const request = http.get(url, (response) => {
      response.resume();
      settle(true);
    });
    request.on("error", () => settle(false));
    request.setTimeout(2_000, () => request.destroy());
  });

let server;
let quitting = false;

function startServer(node, path, port) {
  const logs = app.getPath("logs");
  mkdirSync(logs, { recursive: true });
  const logFile = join(logs, "server.log");
  const out = openSync(logFile, "a");
  server = spawn(node, [join(ROOT, "node_modules", "next", "dist", "bin", "next"), "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: ROOT,
    env: { ...process.env, PATH: path, NODE_ENV: "production" },
    stdio: ["ignore", out, out],
    windowsHide: true,
    // its own process group, so a signal on quit reaches the server and not this app
    detached: process.platform !== "win32",
  });
  return logFile;
}

// The server stops the agents it started as it exits. SIGTERM lets it; on
// Windows there is no such signal, so the tree is ended outright.
function stopServer() {
  if (server === undefined || server.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync(join(process.env.SystemRoot ?? "C:\\Windows", "System32", "taskkill.exe"), ["/PID", String(server.pid), "/T", "/F"], { windowsHide: true });
  } else {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      // already gone
    }
  }
}

async function waitForServer(url) {
  const until = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < until) {
    if (server.exitCode !== null) return false;
    if (await answers(url)) return true;
    await new Promise((settle) => setTimeout(settle, 400));
  }
  return false;
}

let origin;
let window;

const splash = (text) =>
  "data:text/html;charset=utf-8," +
  encodeURIComponent(
    `<!doctype html><meta charset="utf-8"><body style="margin:0;height:100vh;display:grid;place-items:center;background:#edecee;color:#86868d;font:15px system-ui,sans-serif">${text}</body>`,
  );

function openWindow() {
  window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    title: "My Tiny Office",
    backgroundColor: "#edecee",
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  // The window stays on the office; anything else opens in the user's browser.
  const outside = (url) => {
    if (url.startsWith(origin + "/") || url === origin) return false;
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return true;
  };
  window.webContents.on("will-navigate", (event, url) => {
    if (outside(url)) event.preventDefault();
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    outside(url);
    return { action: "deny" };
  });
  window.on("closed", () => (window = undefined));
  void window.loadURL(origin === undefined ? splash(words().opening) : origin);
}

async function start() {
  // only copying to the clipboard, which the page's copy buttons need
  session.defaultSession.setPermissionRequestHandler((_, permission, grant) => grant(permission === "clipboard-sanitized-write"));

  openWindow();
  const fail = (message) => {
    if (quitting) return;
    dialog.showErrorBox("My Tiny Office", message);
    app.quit();
  };

  if (!existsSync(join(ROOT, ".next", "BUILD_ID"))) return fail(words().notBuilt);
  const path = userPath();
  const node = findNode(path);
  if (node === undefined) return fail(words().noNode);

  const port = await choosePort();
  const logFile = startServer(node, path, port);
  // the server going away, before the office opens or after, ends the app with where to look
  const failed = () => fail(`${words().failed}\n${logFile}`);
  server.once("error", failed);
  server.once("exit", failed);
  const url = `http://127.0.0.1:${port}`;
  if (!(await waitForServer(url))) return failed();
  origin = url;
  if (window === undefined) openWindow();
  else void window.loadURL(origin);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (window === undefined) return openWindow();
    if (window.isMinimized()) window.restore();
    window.focus();
  });
  app.whenReady().then(start);
  // On macOS closing the window leaves the office running, as apps there do:
  // the work goes on, and the Dock brings the window back.
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
  app.on("activate", () => {
    if (window === undefined && origin !== undefined) openWindow();
  });
  app.on("before-quit", () => (quitting = true));
  app.on("will-quit", stopServer);
}
