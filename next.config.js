/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // Bundle worker/index.js (push + notificationclick handlers) into the SW.
  customWorkerDir: "worker",
  // Don't try to precache API routes; they need the network (and secrets).
  buildExcludes: [/app-build-manifest\.json$/],
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    // DiceBear avatars for the leaderboard.
    remotePatterns: [{ protocol: "https", hostname: "api.dicebear.com" }],
  },
};

module.exports = withPWA(nextConfig);
