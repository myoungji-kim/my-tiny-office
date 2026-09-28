import type { ReactNode } from "react";

import type { Dictionary, Locale } from "../i18n";
import type { MilestoneView, TeamView } from "../server/view-model";

import { dayText } from "./dates";
import { teamName } from "./names";

const I: Readonly<Record<string, ReactNode>> = {
  flag: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <path d="M4 14V2.6h7.6l-1.6 2.7 1.6 2.7H4" />
    </svg>
  ),
  person: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="8" cy="5.4" r="2.5" />
      <path d="M3.2 13.6c0-2.7 2.2-4.8 4.8-4.8s4.8 2.1 4.8 4.8" />
    </svg>
  ),
  team: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <rect x="5.5" y="1.8" width="5" height="3.6" rx=".8" />
      <rect x="1.6" y="10.6" width="5" height="3.6" rx=".8" />
      <rect x="9.4" y="10.6" width="5" height="3.6" rx=".8" />
      <path d="M8 5.4v2.6M4.1 10.6V8h7.8v2.6" />
    </svg>
  ),
  task: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <rect x="2.6" y="2.6" width="10.8" height="10.8" rx="1.6" />
      <path d="M5.4 8.2l1.8 1.8 3.4-3.6" />
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M1.8 8S4 3.8 8 3.8 14.2 8 14.2 8 12 12.2 8 12.2 1.8 8 1.8 8z" />
      <circle cx="8" cy="8" r="1.9" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M3 2.6h7.4L13 5.2v8.2H3z" />
      <path d="M5.4 6.4h5.2M5.4 9h5.2M5.4 11.2h3" />
    </svg>
  ),
};

const ICON: Readonly<Record<MilestoneView["kind"], string>> = {
  founded: "flag",
  joined: "person",
  teamFormed: "team",
  firstTaskDone: "task",
  tasksDone: "task",
  firstReview: "eye",
  memories: "book",
  projectFinished: "flag",
};

// A milestone keeps its kind and its facts, never a sentence: the words are
// the dictionary's, and a team keeps whatever name it has now.
function sentence(m: MilestoneView, t: Dictionary, teams: readonly TeamView[]): string {
  const w = t.company.miles;
  switch (m.kind) {
    case "founded":
      return w.founded;
    case "joined":
      return m.first ? w.joinedFirst(m.employeeName) : w.joined(m.employeeName);
    case "teamFormed": {
      const team = teams.find((x) => x.id === m.teamId);
      return team === undefined ? w.aTeamFormed : w.teamFormed(teamName(team, t.teams));
    }
    case "firstTaskDone":
      return w.firstTaskDone;
    case "tasksDone":
      return w.tasksDone(m.count);
    case "firstReview":
      return w.firstReview;
    case "memories":
      return w.memories(m.count);
    case "projectFinished":
      return w.projectFinished(m.projectName);
  }
}

export function MilestoneRow({ m, locale, t, teams }: { readonly m: MilestoneView; readonly locale: Locale; readonly t: Dictionary; readonly teams: readonly TeamView[] }) {
  return (
    <div className="mile">
      <span className="mile-date">{dayText(locale, m.at)}</span>
      <span className="mile-ic">{I[ICON[m.kind]]}</span>
      <span className="mile-tx">{sentence(m, t, teams)}</span>
    </div>
  );
}
