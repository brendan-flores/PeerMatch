import type { NextConfig } from "next";

/** Backend for /api and /socket.io rewrites (set API_PROXY_URL on Vercel). */
function getApiBackendOrigin(): string {
  const raw =
    process.env.API_PROXY_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:5000";
  return raw.trim().replace(/\/$/, "");
}

const apiBackend = getApiBackendOrigin();

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiBackend}/api/:path*`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${apiBackend}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
