import { revalidatePath } from "next/cache";

import { getCompanyFiles } from "../../../infrastructure/persistence/company-files";
import { importCompany, MAX_IMPORT_BYTES } from "../../../infrastructure/persistence/import-company";

export const dynamic = "force-dynamic";

// The file arrives as the request body. It adds a company and never touches
// the one that is open.
export async function POST(request: Request): Promise<Response> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (!(declared > 0) || declared > MAX_IMPORT_BYTES) return Response.json({ error: "notACompany" }, { status: 413 });
  const bytes = new Uint8Array(await request.arrayBuffer());
  const imported = importCompany(getCompanyFiles(), bytes);
  if (!imported.ok) return Response.json({ error: imported.reason }, { status: 422 });
  revalidatePath("/", "layout");
  return Response.json({ companyId: imported.companyId, name: imported.name, foldersToChoose: imported.foldersToChoose });
}
