import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local preview uses IPv4 to avoid another application's localhost/IPv6 port.
  // Next's development debug channel must accept the same preview origin.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
