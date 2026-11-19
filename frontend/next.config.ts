import type { NextConfig } from "next";
import { z } from "zod";

const backendOrigin = z
  .url({ protocol: /^https?$/ })
  .refine((value) => {
    const url = new URL(value);
    return (
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/"
    );
  })
  .safeParse(process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:4000");
if (!backendOrigin.success)
  throw new Error(
    "Invalid BACKEND_ORIGIN. Use an HTTP(S) origin without credentials, query, or path.",
  );
const origin = new URL(backendOrigin.data).origin;

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  async rewrites() {
    return ["/feed", "/swipe", "/matches"].map((path) => ({
      source: path,
      destination: `${origin}${path}`,
    }));
  },
};

export default nextConfig;
