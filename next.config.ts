import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.SALVACEL_NEXT_DIST_DIR || ".next",
  experimental: {
    cpus: 2,
    optimizePackageImports: ["@heroui/react"],
  },
};

export default nextConfig;
