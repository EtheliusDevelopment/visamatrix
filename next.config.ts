import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // /sitemap/:id.xml → /sitemap/:id (sub-sitemap con estensione .xml)
      {
        source: '/sitemap/:id.xml',
        destination: '/sitemap/:id',
      },
    ];
  },
};

export default nextConfig;
