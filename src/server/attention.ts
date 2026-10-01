import { toCompanyId } from "../domain/ids";
import { getDictionary, type Locale } from "../i18n";
import { createAppContext } from "../infrastructure/app-context";
import { getCompanyFiles } from "../infrastructure/persistence/company-files";

import { loadToday, type TodayItem } from "./today";

// What waits on the user, as the desktop app says it: one line per thing,
// keyed so it is said once, and opening on the task it is about.
export interface Attention {
  readonly key: string;
  readonly title: string;
  readonly body: string;
  readonly href: string;
}

type Part = string | { readonly b: string };
const plain = (parts: readonly Part[]): string => parts.map((p) => (typeof p === "string" ? p : p.b)).join("");

// the stops that wait on the user, besides finished work
const STOPPED = ["lost", "failed", "stopped", "stoppedAtWrite", "budget"] as const;
const isStop = (kind: string): kind is (typeof STOPPED)[number] => (STOPPED as readonly string[]).includes(kind);

export function attentionOf(companyId: string, companyName: string, items: readonly TodayItem[], names: Readonly<Record<string, string>>, locale: Locale): Attention[] {
  const line = getDictionary(locale).office.today.line;
  return items.flatMap((i) => {
    if (!i.open || i.task === undefined) return [];
    const who = i.who === undefined ? "" : (names[i.who] ?? "");
    const kind = i.kind;
    const said = kind === "waiting" ? line.waiting(who, i.task.title, i.took ?? 0) : isStop(kind) ? line[kind](who, i.task.title) : undefined;
    if (said === undefined) return [];
    return [
      {
        key: [companyId, i.kind, i.task.id, i.at].join(":"),
        title: companyName,
        body: plain(said),
        href: `/attention/open?company=${encodeURIComponent(companyId)}&task=${encodeURIComponent(i.task.id)}`,
      },
    ];
  });
}

export async function loadAttention(locale: Locale, now: number): Promise<Attention[]> {
  const files = getCompanyFiles();
  const all: Attention[] = [];
  for (const id of files.ids()) {
    try {
      const ctx = createAppContext(files.open(toCompanyId(id)));
      const company = await ctx.companies.findById(toCompanyId(id));
      if (company === undefined) continue;
      const names = Object.fromEntries((await ctx.employees.findByCompany(company.id)).map((e) => [e.id, e.name]));
      all.push(...attentionOf(id, company.name, await loadToday(id, now), names, locale));
    } catch {
      // a company file that cannot be read says nothing, and keeps no other from speaking
    }
  }
  return all;
}
