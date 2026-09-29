import type { ReactNode } from "react";

import type { Dictionary } from "../i18n";
import type { TaskView } from "../server/view-model";

// A command or a branch is shown as code wherever the words put {code}.
export function withCode(template: string, code: string): ReactNode {
  const [before, after] = template.split("{code}");
  return (
    <>
      {before}
      <code>{code}</code>
      {after}
    </>
  );
}

export function blockerText(task: TaskView, w: Dictionary["projects"]): ReactNode {
  const b = task.blocker;
  if (b === undefined) return undefined;
  // the card names the reason; the command itself is on the task's page
  if (b.kind === "commandNotAllowed") return w.commandBlocked;
  return b.kind === "disconnected" ? w.agentLost : b.kind === "budgetReached" ? w.budgetReached : w.workspaceUnavailable;
}

// A queued task has not started this round, so it shows its priority instead.
export function timeLine(task: TaskView, w: Dictionary["projects"]): string | undefined {
  if (task.status === "working") return w.spent(task.minutesTaken);
  if (task.status !== "backlog" && task.minutesTaken > 0) return w.took(task.minutesTaken);
  return undefined;
}
