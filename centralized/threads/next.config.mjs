/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@userless/ui-components", "api-wrapper", "ui-components"],
  webpack: (config, { isServer, dev }) => {
    config.resolve.extensionAlias = {
      ".js": [".js", ".ts"],
      ".jsx": [".jsx", ".tsx"],
    };
    
    // Watch for changes in local packages during development
    if (dev) {
      config.devtool = "eval-source-map";
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "!**/node_modules/@userless/ui-components/**",
          "!**/node_modules/api-wrapper/**",
          "!**/node_modules/ui-components/**"
        ],
      };
    }
    return config;
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3001", "localhost:3000"],
    },
  }
};

export default nextConfig;
