import { revalidatePath } from "next/cache";

import type { AppContext } from "../application/context";
import { toCompanyId, type CompanyId } from "../domain/ids";
import type { Priority } from "../domain/project";
import { createAppContext } from "../infrastructure/app-context";
import { getCompanyFiles } from "../infrastructure/persistence/company-files";
import { getWork } from "../infrastructure/work";

export interface Outcome {
  readonly error?: string;
}

// Every action names its company, and only a company that has a file here is opened.
export function contextFor(id: unknown): AppContext | undefined {
  const files = getCompanyFiles();
  return typeof id === "string" && files.has(id) ? createAppContext(files.open(toCompanyId(id))) : undefined;
}

// Runs one use case in the named company and hands back only its reason, if any.
export async function inCompany(
  companyId: unknown,
  work: (ctx: AppContext, companyId: CompanyId) => Promise<{ readonly ok: true } | { readonly ok: false; readonly reason: string }>,
): Promise<Outcome> {
  const ctx = contextFor(companyId);
  if (ctx === undefined) return { error: "companyNotFound" };
  const result = await work(ctx, toCompanyId(String(companyId)));
  if (!result.ok) return { error: result.reason };
  // what changed may start, stop or resume someone's work
  void getWork().kick();
  revalidatePath("/", "layout");
  return {};
}

// What arrives from the browser is only trusted to be what these make of it.
export const str = (value: unknown): string => (typeof value === "string" ? value : "");
export const optional = (value: unknown): string | undefined => (typeof value === "string" && value !== "" ? value : undefined);
export const priorityOf = (value: unknown): Priority => (value === "low" || value === "high" ? value : "normal");
