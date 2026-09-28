import { describe, expect, it } from "vitest";

import type { Executable, RunResult } from "../process/run";

import { pickFolder, type PickerDeps } from "./folder-picker";

const answer = (stdout: string, code = 0): RunResult => ({ code, stdout, stderr: "", timedOut: false, truncated: false });

function deps(platform: NodeJS.Platform, installed: readonly string[], result: RunResult): PickerDeps & { calls: string[][] } {
  const calls: string[][] = [];
  return {
    calls,
    platform,
    find: (name): Executable => (installed.includes(name) ? { kind: "found", path: "/bin/" + name } : { kind: "missing" }),
    run: async (file, args) => {
      calls.push([file, ...args]);
      return result;
    },
  };
}

describe("pickFolder", () => {
  it("returns the folder the system dialog chose, without its line ending", async () => {
    const mac = deps("darwin", ["osascript"], answer("/Users/me/code/tinysoft/\n"));

    await expect(pickFolder(mac)).resolves.toEqual({ ok: true, path: "/Users/me/code/tinysoft/" });
    expect(mac.calls).toEqual([["/bin/osascript", "-e", "POSIX path of (choose folder)"]]);
  });

  it("uses the first dialog Linux has", async () => {
    const linux = deps("linux", ["kdialog"], answer("/home/me/code\n"));

    await expect(pickFolder(linux)).resolves.toEqual({ ok: true, path: "/home/me/code" });
    expect(linux.calls[0][0]).toBe("/bin/kdialog");
  });

  it("runs a fixed PowerShell script on Windows, with nothing of the user's in it", async () => {
    const windows = deps("win32", ["powershell"], answer("C:\\Users\\me\\코드"));

    await expect(pickFolder(windows)).resolves.toEqual({ ok: true, path: "C:\\Users\\me\\코드" });
    expect(windows.calls[0].slice(1, 5)).toEqual(["-NoProfile", "-NonInteractive", "-STA", "-EncodedCommand"]);
    expect(Buffer.from(windows.calls[0][5], "base64").toString("utf16le")).toContain("IFileDialog");
  });

  it("tells a cancel from a computer with no dialog", async () => {
    await expect(pickFolder(deps("darwin", ["osascript"], answer("", 1)))).resolves.toEqual({ ok: false, reason: "pickCancelled" });
    await expect(pickFolder(deps("linux", [], answer("")))).resolves.toEqual({ ok: false, reason: "pickerUnavailable" });
  });
});
