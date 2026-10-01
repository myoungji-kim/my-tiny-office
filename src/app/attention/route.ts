import { resolveLocale } from "../../i18n";
import { getCompanyFiles } from "../../infrastructure/persistence/company-files";
import { readSettings } from "../../infrastructure/persistence/settings";
import { loadAttention } from "../../server/attention";

export const dynamic = "force-dynamic";

// What waits on the user across every company, for the desktop app to tell
// them; nothing at all while they have turned that off.
export async function GET(request: Request): Promise<Response> {
  const settings = readSettings(getCompanyFiles().directory);
  if (settings.notifyOff === true) return Response.json([]);
  const locale = settings.locale ?? resolveLocale(request.headers.get("accept-language"));
  return Response.json(await loadAttention(locale, Date.now()));
}
