/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@cloudmake/api-client",
    "@cloudmake/types",
    "@cloudmake/utils",
  ],
  experimental: {
    typedRoutes: true,
  },
};

module.exports = nextConfig;
