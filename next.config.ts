import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Inject build timestamp so client can detect stale bundles
  env: {
    NEXT_PUBLIC_BUILD_ID: Date.now().toString(),
  },
  // Unique deployment ID per build — forces new chunk hashes
  generateBuildId: async () => `build-${Date.now()}`,
  async headers() {
    return [
      {
        // HTML pages — always check for fresh version
        source: '/((?!_next/static|_next/image|favicon).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
        ],
      },
    ]
  },
};

export default nextConfig;
