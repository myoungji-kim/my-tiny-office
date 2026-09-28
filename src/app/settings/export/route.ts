import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { toCompanyId } from "../../../domain/ids";
import { getCompanyFiles } from "../../../infrastructure/persistence/company-files";

export const dynamic = "force-dynamic";

// A company leaves as a consistent copy of its file, taken while it stays open.
export function GET(request: Request): Response {
  const id = new URL(request.url).searchParams.get("company") ?? "";
  const files = getCompanyFiles();
  if (!files.has(id)) return new Response(null, { status: 404 });

  const folder = join(files.directory, "exports");
  mkdirSync(folder, { recursive: true });
  const copy = join(folder, `${randomUUID()}.db`);
  try {
    files.open(toCompanyId(id)).copyTo(copy);
    const day = new Date().toISOString().slice(0, 10);
    return new Response(readFileSync(copy), {
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Disposition": `attachment; filename="my-tiny-office-${day}.db"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    rmSync(copy, { force: true });
  }
}
