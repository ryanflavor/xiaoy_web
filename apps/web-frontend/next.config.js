/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@xiaoy/shared-types', '@xiaoy/instruction-parser', '@xiaoy/zmq-protocol'],
  output: 'standalone',
  // API Gateway proxy configuration for development
  async rewrites() {
    return [
      {
        source: '/api/gateway/:path*',
        destination: process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3001/api/:path*',
      },
    ];
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;