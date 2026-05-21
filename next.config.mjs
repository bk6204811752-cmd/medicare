/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,

  // mssql / tedious are native Node packages that must not be bundled by webpack
  serverExternalPackages: ["mssql", "tedious", "@prisma/adapter-mssql"],

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
