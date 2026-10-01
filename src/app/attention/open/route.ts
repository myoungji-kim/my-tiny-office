import { toCompanyId, toTaskId } from "../../../domain/ids";
import { createAppContext } from "../../../infrastructure/app-context";
import { getCompanyFiles } from "../../../infrastructure/persistence/company-files";
import { readSettings, writeSettings } from "../../../infrastructure/persistence/settings";

export const dynamic = "force-dynamic";

// A notification opens its task in its own company, which becomes the one
// the screens show. The way back is built from the address the request came
// to, so the token's cookie goes with it.
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const companyId = params.get("company") ?? "";
  const files = getCompanyFiles();
  const origin = `http://${request.headers.get("host")}`;
  if (!files.has(companyId)) return Response.redirect(origin + "/", 303);
  const task = await createAppContext(files.open(toCompanyId(companyId))).tasks.findById(toTaskId(params.get("task") ?? ""));
  writeSettings(files.directory, { ...readSettings(files.directory), lastCompanyId: companyId });
  return Response.redirect(origin + (task === undefined ? "/" : `/projects/${encodeURIComponent(task.projectId)}/${encodeURIComponent(task.id)}`), 303);
}
