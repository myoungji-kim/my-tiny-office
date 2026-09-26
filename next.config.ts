import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module and must not be bundled for the server.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
