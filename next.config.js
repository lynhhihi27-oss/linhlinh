/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    serverComponentsExternalPackages: ['mssql', 'msnodesqlv8'],
  },
};

module.exports = nextConfig;
