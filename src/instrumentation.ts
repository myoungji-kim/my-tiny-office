// Work runs on the server from the moment it starts, not only while a screen is open.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") (await import("./infrastructure/work")).startWork();
}
