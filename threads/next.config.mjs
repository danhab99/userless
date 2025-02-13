/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["api-wrapper"],
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
};

export default nextConfig;
