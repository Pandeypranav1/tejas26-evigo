import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // Leaflet default marker icons are served from unpkg CDN
      {
        protocol: "https",
        hostname: "unpkg.com",
      },
      // OpenStreetMap tile server (used by Leaflet for map background)
      {
        protocol: "https",
        hostname: "*.tile.openstreetmap.org",
      },
    ],
  },
};

export default nextConfig;
