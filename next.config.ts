// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  env: {
    NEXT_PUBLIC_UMBRELLA_ENV:
      process.env.NODE_ENV === "production" ? "live" : "sandbox",
  },
};

export default nextConfig;
