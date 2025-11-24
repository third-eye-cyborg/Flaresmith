/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@flaresmith/api-client",
    "@flaresmith/types",
    "@flaresmith/utils"
  ],
  experimental: {
    typedRoutes: true
  }
};

module.exports = nextConfig;
