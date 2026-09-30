import type { ReactNode } from "react";

import type { Dictionary } from "../i18n";
import type { EmployeeView, TaskView } from "../server/view-model";

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

// Who picks sent-back work up: its assignee, once back from leave, or whoever is free.
export function reworkWhyOf(who: EmployeeView | undefined, w: Dictionary["projects"]): string {
  return who === undefined ? w.reworkWhyAnyone : who.status === "onLeave" ? w.reworkWhyLater(who.name) : w.reworkWhy(who.name);
}

export function blockerText(task: TaskView, w: Dictionary["projects"]): ReactNode {
  const b = task.blocker;
  if (b === undefined) return undefined;
  // the card names the reason; the command itself is on the task's page
  if (b.kind === "commandNotAllowed") return w.commandBlocked;
  if (b.kind === "writeNotAllowed") return w.writeBlocked;
  return b.kind === "disconnected" ? w.agentLost : b.kind === "runFailed" ? w.runFailed : b.kind === "budgetReached" ? w.budgetReached : w.workspaceUnavailable;
}

// A queued task has not started this round, so it shows its priority instead.
export function timeLine(task: TaskView, w: Dictionary["projects"]): string | undefined {
  if (task.status === "working") return w.spent(task.minutesTaken);
  if (task.status !== "backlog" && task.minutesTaken > 0) return w.took(task.minutesTaken);
  return undefined;
}
