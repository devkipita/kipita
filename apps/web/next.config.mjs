/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // Compile the shared workspace package (ships raw TS, no build step).
  transpilePackages: ["@kipita/shared"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "graph.facebook.com" },
    ],
  },
  async redirects() {
    return [
      // Find-a-ride moved to /home; the query string is preserved automatically.
      { source: "/rides", destination: "/home", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        // Filenames aren't content-hashed, so keep this short enough to re-encode safely.
        source: "/video/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
  // Enable the styled-components SWC transform: stable class names across
  // server/client (no hydration mismatch), plus richer debug labels in dev.
  compiler: {
    styledComponents: {
      displayName: process.env.NODE_ENV !== "production",
      ssr: true,
    },
  },
};

export default nextConfig;
