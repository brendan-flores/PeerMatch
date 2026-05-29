import type { NextConfig } from "next";

/**
 * Socket.IO and HTTP /api/* calls are handled by app/api/[[...path]]/route.ts
 * which reads API_PROXY_URL at runtime (no build-time rewrites needed).
 */

const nextConfig: NextConfig = {
  // No rewrites needed - API calls handled via route.ts at runtime
};

export default nextConfig;
