import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
