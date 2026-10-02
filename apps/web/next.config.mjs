/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // Compile the shared workspace package (ships raw TS, no build step).
  transpilePackages: ["@kipita/shared"],
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
      displayName: true,
      ssr: true,
    },
  },
};

export default nextConfig;
