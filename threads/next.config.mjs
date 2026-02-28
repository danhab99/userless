/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["api-wrapper", "ui-components"],
  webpack: (config, { isServer, dev }) => {
    config.resolve.extensionAlias = {
      ".js": [".js", ".ts"],
      ".jsx": [".jsx", ".tsx"],
    };
    if (dev) {
      config.devtool = "eval-source-map";
    }
    return config;
  },
  experimental: {
    serverActions: true,
  }
};

export default nextConfig;
