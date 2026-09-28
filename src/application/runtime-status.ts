// Whether the company can work at all: Claude Code is found, runs, and is
// signed in on its own. Screens read this; only infrastructure finds it out.
export type ClaudeCodeStatus =
  | { readonly state: "notInstalled" }
  // installed through npm as a .cmd, which cannot be run without a shell
  | { readonly state: "shimOnly"; readonly path: string }
  // found but would not run
  | { readonly state: "broken"; readonly path: string }
  | { readonly state: "signedOut"; readonly version: string }
  | { readonly state: "ready"; readonly version: string; readonly plan: string | undefined };

export const isReady = (status: ClaudeCodeStatus): boolean => status.state === "ready";
