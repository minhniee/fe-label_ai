/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Disable caching
  async headers() {
    return [
      {
        // Disable cache for all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ]
  },
  // Disable compression
  compress: false,
  // Power by header
  poweredByHeader: false,
  // Disable ETags
  generateEtags: false,
  // Trailing slash
  trailingSlash: false,
}

export default nextConfig
