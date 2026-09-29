/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // Compile the shared workspace package (ships raw TS, no build step).
  transpilePackages: ["@kipita/shared"],
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
