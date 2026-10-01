import { resolveLocale } from "../../i18n";
import { getCompanyFiles } from "../../infrastructure/persistence/company-files";
import { readSettings } from "../../infrastructure/persistence/settings";
import { loadAttention } from "../../server/attention";

export const dynamic = "force-dynamic";

// What waits on the user across every company, for the desktop app to tell
// them. It is listed while notifications are off too, so turning them back
// on says only what is new from then.
export async function GET(request: Request): Promise<Response> {
  const settings = readSettings(getCompanyFiles().directory);
  const locale = settings.locale ?? resolveLocale(request.headers.get("accept-language"));
  return Response.json({ notify: settings.notifyOff !== true, items: await loadAttention(locale, Date.now()) });
}
