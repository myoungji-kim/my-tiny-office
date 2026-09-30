import { toCompanyId } from "../domain/ids";
import { createAppContext } from "../infrastructure/app-context";
import { getCompanyFiles } from "../infrastructure/persistence/company-files";
import { readSettings } from "../infrastructure/persistence/settings";
import { listSessions, type Session } from "../infrastructure/runtime/sessions";
import { CAST } from "../ui/paint";

export interface CandidateView extends Session {
  readonly name: string;
  // follows from the session, so the same one always looks the same
  readonly species: string;
  readonly hidden: boolean;
}

const folderName = (folder: string) => folder.split(/[\\/]/).filter(Boolean).at(-1) ?? folder;

function speciesOf(id: string): string {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return CAST[hash % CAST.length].key;
}

export const plazaShown = (): boolean => readSettings(getCompanyFiles().directory).plaza?.off !== true;

// This computer's sessions, less the ones this company has already hired.
export async function loadCandidates(companyId: string): Promise<readonly CandidateView[]> {
  const files = getCompanyFiles();
  const settings = readSettings(files.directory);
  if (settings.plaza?.off === true || !files.has(companyId)) return [];
  const employees = await createAppContext(files.open(toCompanyId(companyId))).employees.findByCompany(toCompanyId(companyId));
  const hired = new Set(employees.map((e) => e.career?.sessionId).filter((id) => id !== undefined));
  const hidden = new Set(settings.plaza?.hidden ?? []);
  return listSessions()
    .filter((s) => !hired.has(s.id))
    .map((s) => ({ ...s, name: folderName(s.folder), species: speciesOf(s.id), hidden: hidden.has(s.id) }));
}
