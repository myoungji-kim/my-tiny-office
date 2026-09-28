import type { ReactNode } from "react";

import type { Dictionary } from "../i18n";
import type { TaskView } from "../server/view-model";

// A command is shown as code wherever the words put it.
export function withCommand(template: string, command: string): ReactNode {
  const [before, after] = template.split("{command}");
  return (
    <>
      {before}
      <code>{command}</code>
      {after}
    </>
  );
}

export function blockerText(task: TaskView, w: Dictionary["projects"]): ReactNode {
  const b = task.blocker;
  if (b === undefined) return undefined;
  return b.kind === "commandNotAllowed" ? withCommand(w.commandBlocked, b.command) : b.kind === "disconnected" ? w.agentLost : w.budgetReached;
}

// A queued task has not started this round, so it shows its priority instead.
export function timeLine(task: TaskView, w: Dictionary["projects"]): string | undefined {
  if (task.status === "working") return w.spent(task.minutesTaken);
  if (task.status !== "backlog" && task.minutesTaken > 0) return w.took(task.minutesTaken);
  return undefined;
}
