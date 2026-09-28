import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import { toCompanyId, type CompanyId } from "../../domain/ids";

import { resolveDataDirectory } from "./data-directory";
import { openDatabase, type DatabaseHandle } from "./database";

// A company id names its file, so only the app's own UUIDs are accepted:
// anything else could point outside the companies folder.
const COMPANY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const isCompanyId = (value: string): boolean => COMPANY_ID.test(value);

export interface CompanyFiles {
  readonly directory: string;
  ids(): readonly CompanyId[];
  has(id: string): boolean;
  pathOf(id: CompanyId): string;
  // Opens an existing company's file; never creates one.
  open(id: CompanyId): DatabaseHandle;
  create(id: CompanyId): DatabaseHandle;
  // Deletes the company's file for good; nothing else of the company is kept.
  remove(id: CompanyId): void;
  close(): void;
}

export function createCompanyFiles(directory: string): CompanyFiles {
  const folder = join(directory, "companies");
  const handles = new Map<CompanyId, DatabaseHandle>();

  const pathOf = (id: string): string => {
    if (!isCompanyId(id)) {
      throw new Error("Not a company id");
    }
    return join(folder, `${id}.db`);
  };

  const connect = (id: CompanyId, create: boolean): DatabaseHandle => {
    let handle = handles.get(id);
    if (handle === undefined) {
      handle = openDatabase(pathOf(id), { create });
      handles.set(id, handle);
    }
    return handle;
  };

  return {
    directory,
    ids: () =>
      existsSync(folder)
        ? readdirSync(folder)
            .filter((name) => name.endsWith(".db"))
            .map((name) => name.slice(0, -".db".length))
            .filter(isCompanyId)
            .sort()
            .map(toCompanyId)
        : [],
    has: (id) => isCompanyId(id) && existsSync(pathOf(id)),
    pathOf,
    open: (id) => connect(id, false),
    create(id) {
      if (existsSync(pathOf(id))) {
        throw new Error("Company already exists");
      }
      return connect(id, true);
    },
    remove(id) {
      const path = pathOf(id);
      handles.get(id)?.close();
      handles.delete(id);
      for (const suffix of ["", "-wal", "-shm"]) rmSync(path + suffix, { force: true });
    },
    close() {
      for (const handle of handles.values()) handle.close();
      handles.clear();
    },
  };
}

// Cached on globalThis so development hot reloads do not accumulate connections.
const cache = globalThis as typeof globalThis & { myTinyOfficeCompanies?: CompanyFiles };

export function getCompanyFiles(): CompanyFiles {
  cache.myTinyOfficeCompanies ??= createCompanyFiles(resolveDataDirectory());
  return cache.myTinyOfficeCompanies;
}
