import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

import { toCompanyId } from "../../../domain/ids";
import { createAppContext } from "../../../infrastructure/app-context";
import { getCompanyFiles } from "../../../infrastructure/persistence/company-files";

export const dynamic = "force-dynamic";

// A company leaves as a consistent copy of its file, taken while it stays open.
export async function GET(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("company") ?? "";
  const files = getCompanyFiles();
  if (!files.has(id)) return new Response(null, { status: 404 });

  const folder = join(files.directory, "exports");
  mkdirSync(folder, { recursive: true, mode: 0o700 });
  const copy = join(folder, `${randomUUID()}.db`);
  try {
    const handle = files.open(toCompanyId(id));
    handle.copyTo(copy);
    const day = new Date().toISOString().slice(0, 10);
    // the company's name, so several exports can be told apart; a plain name for older clients
    const name = (await createAppContext(handle).companies.findById(toCompanyId(id)))?.name ?? "my-tiny-office";
    const named = encodeURIComponent(`${name.replace(/[\\/:*?"<>|\p{Cc}]/gu, "").trim() || "my-tiny-office"}-${day}.db`);
    return new Response(readFileSync(copy), {
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Disposition": `attachment; filename="my-tiny-office-${day}.db"; filename*=UTF-8''${named}`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    rmSync(copy, { force: true });
  }
}
