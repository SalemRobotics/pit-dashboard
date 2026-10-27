import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ssh2 (used by the robot log puller) ships a native .node addon for its crypto fallback, which
  // can't be bundled into a JS/ESM chunk. Keep it (and its dependents) external so Next.js loads it
  // with a plain Node `require` at runtime instead of trying to bundle it.
  serverExternalPackages: ["ssh2", "ssh2-sftp-client", "cpu-features"],
  // The survey is a dialog now; keep old bookmarks working.
  async redirects() {
    return [{ source: "/survey", destination: "/", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
