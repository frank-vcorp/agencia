/**
 * IMPL-20260613-01
 * Configuración de Vitest para el proyecto Bridge.
 *
 * - environment "jsdom" para soportar tests de componentes React
 *   (lib/preregistro.test.tsx) que usan @testing-library/react.
 * - alias "@/*" para resolver imports como "@/lib/..." en los tests.
 * - setupFiles carga los matchers de @testing-library/jest-dom.
 */
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // esbuild es el transformador por defecto en Vitest para TS/TSX.
  // "automatic" activa el nuevo JSX runtime (import { jsx } from "react/jsx-runtime"),
  // que es el que Next.js 15 / React 19 esperan y evita "React is not defined".
  esbuild: {
    jsx: "automatic"
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"]
  }
});
