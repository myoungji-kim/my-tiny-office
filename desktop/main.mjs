// The desktop app is a window onto the app's own local server: it starts
// `next start` with the computer's Node, shows it, and stops it on quit.
// Closing the window is not quitting: the office keeps working behind it.
// Nothing here reaches the server's code or data; the window is a browser tab
// that can go nowhere else (docs/SECURITY.md §6).

import { execFileSync, spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { accessSync, constants, existsSync, mkdirSync, openSync, readFileSync, statSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { delimiter, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { app, BrowserWindow, dialog, Menu, nativeImage, Notification, session, shell, Tray } from "electron";

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
const ATTENTION_EVERY_MS = 5_000;
// Windows shows a notification only for an app whose Start menu shortcut carries this id.
const APP_ID = "local.my-tiny-office";

const WORDS = {
  ko: {
    opening: "사무실 여는 중…",
    noNode: "Node.js를 찾을 수 없어요. Node.js 22 이상을 설치한 뒤 다시 열어 주세요.",
    notBuilt: "앱이 아직 빌드되지 않았어요. 설치한 폴더에서 `npm run build`를 실행한 뒤 다시 열어 주세요.",
    failed: "사무실을 열지 못했어요. 기록을 확인해 주세요:",
    open: "사무실 열기",
    quit: "끝내기",
    stillWorking: "창을 닫아도 직원들은 계속 일해요. 끝내려면 여기서 끝내기를 눌러요.",
  },
  en: {
    opening: "Opening the office…",
    noNode: "Node.js could not be found. Install Node.js 22 or later, then open the app again.",
    notBuilt: "The app has not been built yet. Run `npm run build` in its folder, then open it again.",
    failed: "The office could not open. See the log:",
    open: "Open the office",
    quit: "Quit",
    stillWorking: "The office keeps working with the window closed. Quit from here to stop it.",
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

// The process listening on a local port, and how it was started.
function listener(port) {
  if (process.platform === "win32") {
    const script =
      "$c = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort $env:MTO_PORT -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; " +
      "if ($c) { $p = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $c.OwningProcess); [Console]::Out.Write([string]$c.OwningProcess + \"`n\" + $p.CommandLine) }";
    const out = spawnSync(join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe"), ["-NoProfile", "-NonInteractive", "-Command", script], {
      encoding: "utf8",
      windowsHide: true,
      env: { ...process.env, MTO_PORT: String(port) },
    }).stdout;
    const [pid, ...command] = (out ?? "").split("\n");
    return Number(pid) > 0 ? { pid: Number(pid), command: command.join("\n") } : undefined;
  }
  const pid = Number((spawnSync("/usr/sbin/lsof", ["-nP", `-iTCP@127.0.0.1:${port}`, "-sTCP:LISTEN", "-t"], { encoding: "utf8" }).stdout ?? "").trim().split("\n")[0]);
  if (!(pid > 0)) return undefined;
  return { pid, command: spawnSync("/bin/ps", ["-o", "command=", "-p", String(pid)], { encoding: "utf8" }).stdout ?? "" };
}

// A server this checkout started and a killed app left behind: it is stopped,
// agents and all, so the port is free again. Anything else is left alone.
async function stopLeftBehind(port) {
  const held = listener(port);
  const command = held?.command.toLowerCase() ?? "";
  if (held === undefined || !command.includes(ROOT.toLowerCase()) || !command.includes("next")) return false;
  if (process.platform === "win32") {
    spawnSync(join(process.env.SystemRoot ?? "C:\\Windows", "System32", "taskkill.exe"), ["/PID", String(held.pid), "/T", "/F"], { windowsHide: true });
  } else {
    try {
      process.kill(held.pid, "SIGTERM");
    } catch {
      // gone already
    }
  }
  for (let i = 0; i < 25; i++) {
    if (await portFree(port)) return true;
    await new Promise((settle) => setTimeout(settle, 400));
  }
  return false;
}

// The same port each time keeps what the window remembers (its width, the task split).
async function choosePort() {
  if (await portFree(PORT)) return PORT;
  if (await stopLeftBehind(PORT)) return PORT;
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
// Only this window holds it, so no other program on the computer reaches the server (SECURITY.md §6).
const token = randomBytes(32).toString("hex");
let quitting = false;

function startServer(node, path, port) {
  const logs = app.getPath("logs");
  mkdirSync(logs, { recursive: true });
  const logFile = join(logs, "server.log");
  const out = openSync(logFile, "a");
  server = spawn(node, [join(ROOT, "node_modules", "next", "dist", "bin", "next"), "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: ROOT,
    env: { ...process.env, PATH: path, NODE_ENV: "production", MY_TINY_OFFICE_TOKEN: token },
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

// Windows and Linux have no Dock, so the office behind a closed window lives
// in the notification area, where it opens again or quits.
let tray;
async function showTray() {
  if (process.platform === "darwin") return;
  const { png } = await import(pathToFileURL(join(ROOT, "desktop", "icon.mjs")).href);
  tray = new Tray(nativeImage.createFromBuffer(png(32)));
  tray.setToolTip("My Tiny Office");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: words().open, click: () => showWindow() },
      { type: "separator" },
      { label: words().quit, click: () => app.quit() },
    ]),
  );
  tray.on("click", () => showWindow());
}

function showWindow() {
  if (window === undefined) return openWindow();
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

// The installed shortcut is given the app's id, which Windows needs to show
// its notifications; a shortcut to anything else is left as it is.
function claimShortcut() {
  if (process.platform !== "win32") return;
  app.setAppUserModelId(APP_ID);
  const link = join(app.getPath("appData"), "Microsoft", "Windows", "Start Menu", "Programs", "My Tiny Office.lnk");
  try {
    const { target, appUserModelId } = shell.readShortcutLink(link);
    if (target.toLowerCase() === process.execPath.toLowerCase() && appUserModelId !== APP_ID) shell.writeShortcutLink(link, "update", { appUserModelId: APP_ID });
  } catch {
    // not installed from the Start menu: run from the checkout, notifications may not show
  }
}

const attention = (url) =>
  new Promise((settle) => {
    const request = http.get(url + "/attention", { headers: { Cookie: `mto-token-${new URL(url).port}=${token}` } }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => (body += chunk));
      response.on("end", () => {
        try {
          const items = JSON.parse(body);
          settle(response.statusCode === 200 && Array.isArray(items) ? items : undefined);
        } catch {
          settle(undefined);
        }
      });
    });
    request.on("error", () => settle(undefined));
    request.setTimeout(10_000, () => request.destroy());
  });

// What starts waiting on the user is said once, while they are not looking
// at the window. What already waited when the app opened is not said at all.
// The words are the server's, in the user's language; this only shows them.
// held until clicked or dismissed, so a collected one does not lose its click
const shown = new Set();
function watchAttention(url) {
  let seen;
  const look = async () => {
    const items = await attention(url);
    if (items !== undefined) {
      const fresh = seen === undefined ? [] : items.filter((i) => !seen.has(i.key));
      seen = new Set(items.map((i) => i.key));
      const looking = window?.isVisible() === true && window.isFocused();
      if (!looking && Notification.isSupported()) {
        for (const item of fresh) {
          const note = new Notification({ title: String(item.title), body: String(item.body) });
          const href = String(item.href);
          shown.add(note);
          note.on("close", () => shown.delete(note));
          note.on("click", () => {
            shown.delete(note);
            showWindow();
            if (href.startsWith("/")) void window?.loadURL(origin + href);
          });
          note.show();
        }
      }
    }
    if (!quitting) setTimeout(look, ATTENTION_EVERY_MS);
  };
  void look();
}

// said once a run, the first time the window closes with the office still open
let told = false;
function tellStillWorking() {
  if (told || tray === undefined) return;
  told = true;
  if (process.platform === "win32") tray.displayBalloon({ title: "My Tiny Office", content: words().stillWorking });
}

async function start() {
  // only copying to the clipboard, which the page's copy buttons need
  session.defaultSession.setPermissionRequestHandler((_, permission, grant) => grant(permission === "clipboard-sanitized-write"));

  claimShortcut();
  openWindow();
  await showTray().catch(() => undefined);
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
  // cookies are shared across a host's ports, so it is named after this one, as the server expects
  await session.defaultSession.cookies.set({ url, name: `mto-token-${port}`, value: token, httpOnly: true, sameSite: "strict" });
  origin = url;
  if (window === undefined) openWindow();
  else void window.loadURL(origin);
  watchAttention(url);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => showWindow());
  app.whenReady().then(start);
  // Closing the window leaves the office running: the work goes on, and the
  // Dock, the tray icon or opening the app again brings the window back.
  // Without a tray to come back to, closing quits.
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin" && tray === undefined) return app.quit();
    tellStillWorking();
  });
  app.on("activate", () => {
    if (window === undefined && origin !== undefined) openWindow();
  });
  app.on("before-quit", () => (quitting = true));
  app.on("will-quit", stopServer);
}
