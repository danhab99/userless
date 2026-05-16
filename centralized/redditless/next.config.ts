import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@userless/ui-components", "api-wrapper", "ui-components"],
  /* config options here */
};

export default nextConfig;
