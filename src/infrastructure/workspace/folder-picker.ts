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

// A fixed script with nothing of the user's in it. It opens the Explorer
// dialog Windows uses everywhere (IFileOpenDialog in folder mode), owned by a
// topmost window so it comes up above the browser, and writes the path as
// UTF-8 so a Korean folder name survives. It goes as -EncodedCommand, so
// nothing in it is re-parsed on the way.
const WINDOWS_SCRIPT = String.raw`
$ProgressPreference = "SilentlyContinue"
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class ExplorerFolderDialog {
  [ComImport, Guid("DC1C5A9C-E88A-4dde-A5A1-60F82A20AEF7")] class FileOpenDialog {}
  [ComImport, Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IShellItem {
    void BindToHandler(IntPtr pbc, ref Guid bhid, ref Guid riid, out IntPtr ppv);
    void GetParent(out IShellItem parent);
    void GetDisplayName(uint sigdn, [MarshalAs(UnmanagedType.LPWStr)] out string name);
  }
  [ComImport, Guid("42f85136-db7e-439c-85f1-e4075d135fc8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IFileDialog {
    [PreserveSig] int Show(IntPtr owner);
    void SetFileTypes(uint count, IntPtr specs);
    void SetFileTypeIndex(uint index);
    void GetFileTypeIndex(out uint index);
    void Advise(IntPtr events, out uint cookie);
    void Unadvise(uint cookie);
    void SetOptions(uint options);
    void GetOptions(out uint options);
    void SetDefaultFolder(IShellItem item);
    void SetFolder(IShellItem item);
    void GetFolder(out IShellItem item);
    void GetCurrentSelection(out IShellItem item);
    void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string name);
    void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string name);
    void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string title);
    void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string label);
    void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string label);
    void GetResult(out IShellItem item);
  }
  const uint PickFolders = 0x20, ForceFileSystem = 0x40, NoChangeDir = 0x8;
  const uint FileSystemPath = 0x80058000;
  public static string Pick(IntPtr owner) {
    IFileDialog dialog = (IFileDialog)new FileOpenDialog();
    uint options;
    dialog.GetOptions(out options);
    dialog.SetOptions(options | PickFolders | ForceFileSystem | NoChangeDir);
    if (dialog.Show(owner) != 0) return null;
    IShellItem item;
    dialog.GetResult(out item);
    string path;
    item.GetDisplayName(FileSystemPath, out path);
    return path;
  }
}
'@
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$owner = New-Object System.Windows.Forms.Form
$owner.TopMost = $true
$path = [ExplorerFolderDialog]::Pick($owner.Handle)
if ($path) { [Console]::Out.Write($path) }
`;

const encoded = (script: string) => Buffer.from(script, "utf16le").toString("base64");

interface Picker {
  readonly program: string;
  readonly args: readonly string[];
}

function pickersFor(platform: NodeJS.Platform): readonly Picker[] {
  if (platform === "win32") return [{ program: "powershell", args: ["-NoProfile", "-NonInteractive", "-STA", "-EncodedCommand", encoded(WINDOWS_SCRIPT)] }];
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
