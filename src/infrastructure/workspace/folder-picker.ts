import { findExecutable, runProcess, type Executable, type RunResult } from "../process/run";

export type PickResult =
  | { readonly ok: true; readonly path: string }
  | { readonly ok: false; readonly reason: "pickCancelled" | "pickerUnavailable" | "pickerBusy" };

export interface PickerDeps {
  readonly platform: NodeJS.Platform;
  readonly find: (name: string) => Executable;
  readonly run: (file: string, args: readonly string[]) => Promise<RunResult>;
}

// Someone choosing takes as long as they take.
const TIMEOUT_MS = 10 * 60_000;

const realDeps: PickerDeps = {
  platform: process.platform,
  find: (name) => findExecutable(name),
  run: (file, args) => runProcess(file, args, { timeoutMs: TIMEOUT_MS }),
};

// A fixed script with nothing of the user's in it. The owner form keeps the
// dialog above the browser, and the path is written as UTF-8 so a Korean
// folder name survives.
const WINDOWS_SCRIPT = [
  "Add-Type -AssemblyName System.Windows.Forms",
  "[Console]::OutputEncoding = [Text.Encoding]::UTF8",
  "$owner = New-Object System.Windows.Forms.Form",
  "$owner.TopMost = $true",
  "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
  "$dialog.ShowNewFolderButton = $false",
  "if ($dialog.ShowDialog($owner) -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($dialog.SelectedPath) }",
].join("; ");

interface Picker {
  readonly program: string;
  readonly args: readonly string[];
}

function pickersFor(platform: NodeJS.Platform): readonly Picker[] {
  if (platform === "win32") return [{ program: "powershell", args: ["-NoProfile", "-NonInteractive", "-STA", "-Command", WINDOWS_SCRIPT] }];
  if (platform === "darwin") return [{ program: "osascript", args: ["-e", "POSIX path of (choose folder)"] }];
  return [
    { program: "zenity", args: ["--file-selection", "--directory"] },
    { program: "kdialog", args: ["--getexistingdirectory"] },
  ];
}

let open = false;

// Opens the operating system's own folder dialog on this computer. What it
// returns is only a path the user pointed at; checkFolder decides whether it
// can be used.
export async function pickFolder(deps: PickerDeps = realDeps): Promise<PickResult> {
  if (open) return { ok: false, reason: "pickerBusy" };
  const picker = pickersFor(deps.platform)
    .map((p) => ({ ...p, found: deps.find(p.program) }))
    .find((p) => p.found.kind === "found");
  if (picker === undefined || picker.found.kind !== "found") return { ok: false, reason: "pickerUnavailable" };

  open = true;
  try {
    const result = await deps.run(picker.found.path, picker.args);
    const path = result.stdout.replace(/[\r\n]+$/, "");
    if (result.timedOut || result.code !== 0 || path === "") return { ok: false, reason: "pickCancelled" };
    return { ok: true, path };
  } catch {
    return { ok: false, reason: "pickerUnavailable" };
  } finally {
    open = false;
  }
}
