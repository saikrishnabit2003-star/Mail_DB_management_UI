import type { NextConfig } from "next";

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://*.ngrok-free.app",
  "https://*.ngrok.io",
  "https://*.vercel.app",
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // fallback (see note below)
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;