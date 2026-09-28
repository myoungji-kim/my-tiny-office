import type { Priority, ProjectStatus } from "../domain/project";

const FLAG = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
    <path d="M4 14V3h8l-1.6 2.6L12 8.2H4" />
  </svg>
);

export const PAUSE = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M6 4v8M10 4v8" />
  </svg>
);

export const CHECK = (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3.4 8.4l3 3 6.2-6.6" />
  </svg>
);

// A project's status reads by shape as well as colour, the same in the tabs and beside its name.
export function ProjectMark({ status }: { readonly status: ProjectStatus }) {
  if (status === "active") return <span className="dot working" />;
  if (status === "held") return <span className="pmark held">{PAUSE}</span>;
  if (status === "done") return <span className="pmark done">{CHECK}</span>;
  return <span className="pmark planned" />;
}

export const PROJECT_CHIP: Readonly<Record<ProjectStatus, string>> = { planned: "planned", active: "working", held: "leave", done: "available" };

// The word carries the priority; colour only lifts the one that is urgent.
export function Prio({ priority, label }: { readonly priority: Priority; readonly label: string }) {
  return (
    <span className={`prio ${priority}`}>
      {FLAG}
      {label}
    </span>
  );
}
