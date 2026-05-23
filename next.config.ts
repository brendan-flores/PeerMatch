import type { NextConfig } from "next";

/**
 * Socket.IO still uses rewrites to the backend.
 * HTTP /api/* is handled by app/api/[[...path]]/route.ts (reads API_PROXY_URL at runtime).
 */
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
        source: "/socket.io/:path*",
        destination: `${apiBackend}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;
