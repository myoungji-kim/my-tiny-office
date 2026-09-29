import type { StepKind } from "../domain/run";

// What any runtime reports about a run, in the app's words rather than its own.
export type AgentEvent =
  | { readonly kind: "session"; readonly sessionId: string }
  | { readonly kind: "step"; readonly step: StepKind; readonly detail: string }
  // a command the project does not allow, which the runtime refused
  | { readonly kind: "denied"; readonly command: string }
  // how the run ended, with what the agent said last, as it wrote it
  | { readonly kind: "result"; readonly outcome: "finished" | "budgetReached" | "failed"; readonly costUsd: number; readonly report: string | undefined };

export interface LaunchInput {
  // the task's own worktree, the only place the agent may read and write
  readonly cwd: string;
  readonly prompt: string;
  // everything the employee has been taught, carried into the session
  readonly memory: string;
  // the exact commands the project allows
  readonly commands: readonly string[];
  // the session to continue, when the same agent has worked on the task before
  readonly resume: string | undefined;
  // a reviewer only reads: no edits, no commands
  readonly readOnly: boolean;
}

export interface RunningAgent {
  // Ends the run; its exit still arrives.
  stop(): void;
}

export interface AgentRuntime {
  launch(input: LaunchInput, onEvent: (event: AgentEvent) => void, onExit: () => void): RunningAgent;
}

// Where a task's work happens: its own copy of the project's folder.
export interface Workspace {
  prepare(folder: string, taskId: string): Promise<{ readonly ok: true; readonly path: string } | { readonly ok: false }>;
  // Commits the task's work to its own branch. Nothing is pushed.
  commit(folder: string, taskId: string, message: string): Promise<boolean>;
  remove(folder: string, taskId: string): Promise<void>;
  // everything the task changed, as one diff for a reviewer to read; cut short past a size
  diff(folder: string, taskId: string): Promise<string>;
}
