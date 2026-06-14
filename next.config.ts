import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // unpdf bundles PDF.js — must run as a native Node module, not webpack-bundled.
  serverExternalPackages: ["unpdf"],
};

export default nextConfig;
