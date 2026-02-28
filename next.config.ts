import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@uiw/react-md-editor", "@uiw/react-markdown-preview"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
