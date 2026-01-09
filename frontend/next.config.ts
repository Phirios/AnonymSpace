import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://100.64.0.2:3000",
    "100.64.0.2"
  ],
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://backend:3001";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
