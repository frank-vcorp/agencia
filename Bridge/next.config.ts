import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // IMPL-20260513-03: excluir del bundle de webpack para evitar errores de Node.js natives
  serverExternalPackages: ["@react-pdf/renderer"]
};

export default nextConfig;
