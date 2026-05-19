import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow YouTube embeds in iframe
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  // Turbopack config (Next.js 16 default)
  turbopack: {},
};

export default nextConfig;
