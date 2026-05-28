/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: false,

  // nodemailer is a native Node package that must not be bundled by webpack
  serverExternalPackages: ["nodemailer"],

  // Tree-shake heavy icon/utility libraries — only bundle used exports
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns", "sonner"],
  },

  // Include partitioned medicine index in serverless function bundles
  outputFileTracingIncludes: {
    "/api/drug-master/search": ["./data/medicine-index/**/*"],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: res.cloudinary.com; connect-src 'self' *.supabase.co wss://*.supabase.co; frame-src 'self'; worker-src 'self' blob:; child-src 'self' blob:;" }
        ]
      }
    ];
  }
};

export default nextConfig;
