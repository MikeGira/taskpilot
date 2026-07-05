// Next.js dev mode (react-refresh) requires eval; production bundles do not.
// 'unsafe-eval' is therefore added to script-src ONLY in development —
// the production CSP is unchanged.
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : null,
  'https://js.stripe.com',
  'https://va.vercel-scripts.com',
]
  .filter(Boolean)
  .join(' ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src ${scriptSrc}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self' https://*.supabase.co https://api.stripe.com https://vitals.vercel-insights.com",
              "frame-src https://js.stripe.com https://hooks.stripe.com",
              "font-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },
};

export default nextConfig;
