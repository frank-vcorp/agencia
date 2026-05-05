/**
 * IMPL-20260505-01
 * Respaldo: context/00_ARQUITECTURA.md, context/SPECs/SPEC_ARCH-20260504-04_bridge_v1_roles_base_y_flujos.md
 */
import { describe, expect, it } from "vitest";

import { modulePages, p0Combinations, rolePages, roleViews } from "./bridge-data";

describe("bridge-data", () => {
  it("expone las tres superficies base del piloto", () => {
    expect(rolePages.map((role) => role.key)).toEqual(["operador", "disenador", "cliente"]);
    expect(Object.keys(roleViews)).toEqual(["operador", "disenador", "cliente"]);
  });

  it("mantiene visibles los cinco modulos P0 del shell", () => {
    expect(modulePages.map((module) => module.key)).toEqual([
      "briefs",
      "cotizaciones",
      "activos",
      "crm",
      "contexto-agentes"
    ]);
  });

  it("conserva el contrato minimo de combinaciones P0", () => {
    expect(p0Combinations).toHaveLength(16);
    expect(p0Combinations.every((combination) => combination.id.startsWith("p0_"))).toBe(true);
  });
});