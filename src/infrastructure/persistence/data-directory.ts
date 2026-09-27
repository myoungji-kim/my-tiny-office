import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

const APP_DIRECTORY = "my-tiny-office";

// The per-user data directory, never the project folder, so switching
// branches or deleting the checkout never destroys a company.
export function resolveDataDirectory(
  env: Readonly<Record<string, string | undefined>> = process.env,
  platform: NodeJS.Platform = process.platform,
  home: string = homedir(),
): string {
  const configured = env.MY_TINY_OFFICE_DATA_DIR;
  if (configured !== undefined && configured !== "") {
    return isAbsolute(configured) ? configured : resolve(configured);
  }

  if (platform === "win32") {
    return join(env.LOCALAPPDATA ?? join(home, "AppData", "Local"), APP_DIRECTORY);
  }
  if (platform === "darwin") {
    return join(home, "Library", "Application Support", APP_DIRECTORY);
  }
  return join(env.XDG_DATA_HOME ?? join(home, ".local", "share"), APP_DIRECTORY);
}
