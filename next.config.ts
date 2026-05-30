import type { NextConfig } from "next";

/**
 * Socket.IO and HTTP /api/* calls are handled by app/api/[[...path]]/route.ts
 * which proxies to Render using NEXT_PUBLIC_API_BASE_URL (API_PROXY_URL optional).
 */

const nextConfig: NextConfig = {
  // No rewrites needed - API calls handled via route.ts at runtime
};

export default nextConfig;
