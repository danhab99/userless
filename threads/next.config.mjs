/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['api-wrapper'],
  webpack: (config, { isServer }) => {
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts'],
      '.jsx': ['.jsx', '.tsx'],
    }
    return config
  },
}

export default nextConfig