import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  distDir: ".next-showcase",
  serverExternalPackages: [
    "@keeperhub/elizaos",
    "@elizaos/core",
    "fastembed",
    "onnxruntime-node",
    "@anush008/tokenizers",
  ],
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
