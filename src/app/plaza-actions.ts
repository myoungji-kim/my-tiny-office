"use server";

import { revalidatePath } from "next/cache";

import { isReady } from "../application/runtime-status";
import { hireEmployee } from "../application/employee";
import { SPECIES } from "../domain/employee";
import { toAreaId, toCompanyId, toRoleId, toTeamId } from "../domain/ids";
import { getDictionary } from "../i18n";
import { getCompanyFiles } from "../infrastructure/persistence/company-files";
import { readSettings, writeSettings } from "../infrastructure/persistence/settings";
import { readCareer } from "../infrastructure/runtime/career-read";
import { claudeCodeStatus } from "../infrastructure/runtime/claude-code-status";
import { isSessionId, readSession, sessionFile } from "../infrastructure/runtime/sessions";
import { getWork } from "../infrastructure/work";
import { loadCandidates, type CandidateView } from "../server/plaza";
import { areaName } from "../components/names";

import { contextFor, optional, str } from "./action-context";
import type { WhoInput } from "./people-actions";

const plazaOf = (directory: string) => readSettings(directory).plaza ?? { hidden: [] };

// 설정 › 일반 › 광장: off reads no session file at all.
export async function setPlazaShownAction(shown: boolean): Promise<void> {
  const { directory } = getCompanyFiles();
  const settings = readSettings(directory);
  const hidden = plazaOf(directory).hidden;
  writeSettings(directory, { ...settings, plaza: shown === true ? (hidden.length ? { hidden } : undefined) : { off: true, hidden } });
  revalidatePath("/", "layout");
}

// Hiding is only this note; the session file is never touched.
export async function hideCandidateAction(sessionId: string, hide: boolean): Promise<void> {
  if (typeof sessionId !== "string" || !isSessionId(sessionId)) return;
  const { directory } = getCompanyFiles();
  const settings = readSettings(directory);
  const plaza = plazaOf(directory);
  const hidden = hide === true ? [...new Set([...plaza.hidden, sessionId])] : plaza.hidden.filter((id) => id !== sessionId);
  writeSettings(directory, { ...settings, plaza: plaza.off === true || hidden.length ? { ...(plaza.off === true ? { off: true } : {}), hidden } : undefined });
  revalidatePath("/plaza");
}

// The hire dialog's 경력 가져오기 lists the same sessions the plaza does.
export async function candidatesAction(companyId: string): Promise<readonly CandidateView[]> {
  return typeof companyId === "string" ? loadCandidates(companyId) : [];
}

export type CareerRead =
  | {
      readonly knows: readonly { readonly areaId: string; readonly text: string; readonly known: boolean }[];
      readonly style: readonly { readonly text: string; readonly known: boolean }[];
      readonly dropped: number;
      readonly cut: boolean;
    }
  | { readonly error: string };

const same = (a: string) => a.replace(/\s+/g, " ").trim().toLowerCase();

// One read-only Claude run over the session, proposing what the hire brings.
export async function readCareerAction(companyId: string, sessionId: string): Promise<CareerRead> {
  const ctx = contextFor(companyId);
  if (ctx === undefined) return { error: "companyNotFound" };
  if (plazaOf(getCompanyFiles().directory).off === true) return { error: "plazaOff" };
  const file = typeof sessionId === "string" ? sessionFile(sessionId) : undefined;
  const session = file === undefined ? undefined : readSession(sessionId);
  if (file === undefined || session === undefined) return { error: "sessionNotFound" };
  // someone is still writing it in a terminal
  if (session.inUse) return { error: "sessionInUse" };
  if (!isReady(await claudeCodeStatus())) return { error: "claudeNotReady" };

  const company = toCompanyId(companyId);
  const words = getDictionary("en").areas;
  const areas = (await ctx.areas.findByCompany(company)).map((a) => ({ id: a.id, name: areaName({ id: a.id, starting: a.starting, name: a.name }, words) }));
  const read = await readCareer(file, areas);
  if (!read.ok) return { error: "careerReadFailed" };
  // what the company already knows is offered unticked
  const known = new Set((await ctx.memories.findByCompany(company)).map((m) => same(m.text)));
  return {
    knows: read.proposal.knows.map((k) => ({ areaId: k.area, text: k.text, known: known.has(same(k.text)) })),
    style: read.proposal.style.map((text) => ({ text, known: known.has(same(text)) })),
    dropped: read.excerpt.dropped,
    cut: read.excerpt.cut,
  };
}

export interface BroughtInput {
  readonly sessionId: string | undefined;
  readonly expertise: readonly { readonly areaId: string; readonly text: string }[];
  readonly style: readonly string[];
}

// A hire from the plaza, or with 경력 가져오기: the session's folder and dates
// are read here, never taken from the browser.
export async function hireWithCareerAction(companyId: string, who: WhoInput, brought: BroughtInput): Promise<{ readonly id?: string; readonly error?: string }> {
  const ctx = contextFor(companyId);
  if (ctx === undefined || typeof who !== "object" || who === null) return { error: ctx === undefined ? "companyNotFound" : "unknown" };
  const species = SPECIES.find((s) => s === who?.species);
  if (species === undefined) return { error: "speciesUnknown" };
  const sessionId = optional(brought?.sessionId);
  const session = sessionId === undefined ? undefined : readSession(sessionId);
  if (sessionId !== undefined && session === undefined) return { error: "sessionNotFound" };
  const company = toCompanyId(companyId);
  // a session is someone's past once per company
  if (session !== undefined && (await ctx.employees.findByCompany(company)).some((e) => e.career?.sessionId === session.id)) return { error: "sessionHired" };
  const lines = (value: unknown) => (Array.isArray(value) ? value : []);
  const result = await hireEmployee(ctx, {
    companyId: company,
    name: str(who.name),
    species,
    roleId: toRoleId(str(who.roleId)),
    teamId: optional(who.teamId) === undefined ? undefined : toTeamId(str(who.teamId)),
    career: session === undefined ? undefined : { sessionId: session.id, folder: session.folder, from: session.from, to: session.to },
    brought:
      session === undefined
        ? undefined
        : {
            expertise: lines(brought.expertise).map((m) => ({ areaId: toAreaId(str(m?.areaId)), text: str(m?.text) })),
            style: lines(brought.style).map(str),
          },
  });
  if (!result.ok) return { error: result.reason };
  // someone new and free may take work from the backlog
  void getWork().kick();
  revalidatePath("/", "layout");
  return { id: result.value.employee.id };
}
