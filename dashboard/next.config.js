/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use 'export' for Azure Static Web Apps: npm run build:static
  // Use 'standalone' for local dev / App Service: npm run build
  output: process.env.NEXT_OUTPUT === 'export' ? 'export' : 'standalone',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

module.exports = nextConfig;
