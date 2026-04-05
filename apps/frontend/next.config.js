/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/:path*`,
      },
      {
        source: '/ws',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/ws`,
      },
    ];
  },
};

module.exports = nextConfig;
