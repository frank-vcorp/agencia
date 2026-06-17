/**
 * IMPL-20260613-01
 * Setup global para Vitest:
 *   - Importa matchers de @testing-library/jest-dom
 *     (toBeInTheDocument, toHaveTextContent, etc.)
 *   - Limpia el DOM entre tests para que screen.getBy* no encuentre
 *     duplicados de renders anteriores (necesario para tests de componentes
 *     como lib/preregistro.test.tsx que renderiza <PreregistroPage />).
 */
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
