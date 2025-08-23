/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Prevents your site from being framed by others
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // Prevents MIME type sniffing
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains', // Force HTTPS
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin', // Limits information sent in referrer
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()', // Restricts browser features
          },
        ],
      },
    ];
  },
};

export default nextConfig;
