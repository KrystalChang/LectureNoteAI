import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist"],

  // Vercel only bundles files it can statically trace. pdfjs loads its
  // "fake worker" (pdf.worker.mjs) via a runtime-computed dynamic import that
  // the tracer can't see, so without this the deployed /api/upload function
  // dies with: Setting up fake worker failed: "Cannot find module
  // '/var/task/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'".
  outputFileTracingIncludes: {
    "/api/upload": ["./node_modules/pdfjs-dist/legacy/build/**/*"],
  },
};

export default nextConfig;
