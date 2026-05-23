/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: false,

  // mssql / tedious are native Node packages that must not be bundled by webpack
  serverExternalPackages: ["mssql", "tedious", "@prisma/adapter-mssql", "nodemailer"],

  // Tree-shake heavy icon/utility libraries — only bundle used exports
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns", "sonner"],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }
        ]
      }
    ];
  }
};

export default nextConfig;
