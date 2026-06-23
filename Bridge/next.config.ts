import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // IMPL-20260513-03: excluir del bundle de webpack para evitar errores de Node.js natives
  serverExternalPackages: ["@react-pdf/renderer"],
  // FIX-20260623-01: subir el limite del body de Server Actions para permitir
  // uploads de logo de brand kit de hasta 5MB (ver BRAND_KIT_LOGO_MAX_BYTES).
  // Default de Next 15.5 es 1MB, lo que causaba 413/400 al subir logos reales.
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb"
    }
  }
};

export default nextConfig;
