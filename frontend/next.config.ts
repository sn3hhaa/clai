import type { NextConfig } from "next";

/** Sub-path for GitHub Pages ("/clai"); empty for local development. */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;
/** Static HTML export for hosts without a Node server (GitHub Pages). */
const staticExport = process.env.STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  devIndicators: false,
  basePath,
  // Tailwind CSS v4 runs as a Turbopack loader in this template (no PostCSS config).
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"] },
    },
  },
  ...(staticExport && {
    output: "export",
    trailingSlash: true, // Pages serves /talk/index.html for /talk/
    images: { unoptimized: true },
  }),
};

export default nextConfig;
