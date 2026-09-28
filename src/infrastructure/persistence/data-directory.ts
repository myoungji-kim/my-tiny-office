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

  // An empty or relative value would put the companies under whatever folder
  // the app started in, the project folder included, so it counts as unset.
  const usable = (value: string | undefined) => (value !== undefined && isAbsolute(value) ? value : undefined);
  if (platform === "win32") {
    return join(usable(env.LOCALAPPDATA) ?? join(home, "AppData", "Local"), APP_DIRECTORY);
  }
  if (platform === "darwin") {
    return join(home, "Library", "Application Support", APP_DIRECTORY);
  }
  return join(usable(env.XDG_DATA_HOME) ?? join(home, ".local", "share"), APP_DIRECTORY);
}
