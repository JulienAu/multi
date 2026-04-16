import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  output: 'standalone',
  outputFileTracingIncludes: {
    '/api/ars-coach/*': ['./lib/ars-coach/**/*'],
  },
};

export default nextConfig;
