import type { AreaView, TeamView } from "../server/view-model";

// What the product suggests is stored as a key and shown in the reader's
// language; what the user named is shown as written.
const named = (key: string | undefined, name: string | undefined, words: Readonly<Record<string, string>>) =>
  name ?? (key === undefined ? "" : (words[key] ?? key));

export const teamName = (team: TeamView, words: Readonly<Record<string, string>>): string => named(team.suggested, team.name, words);

export const areaName = (area: AreaView, words: Readonly<Record<string, string>>): string => named(area.starting, area.name, words);
