import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep this app framework-plain: no image domains, no rewrites/redirects
  // beyond what the app routes themselves handle. `apps/web` deliberately
  // has no restaurant search/discovery UI (Stage 3 scope is auth + a
  // minimal account area), so there is nothing here yet that needs remote
  // image loading, custom headers, etc.
  reactStrictMode: true,
};

export default nextConfig;
