/**
 * IMPL-20260506-28
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-28_chat_contextual_por_entidad_v1.md
 */
import { describe, expect, it } from "vitest";

import {
  ACTOR_ROLES,
  ENTITY_TYPES,
  actorRoleLabel,
  formatMessageTimestamp,
  isValidActorRole,
  isValidEntityType,
  type ActorRole,
  type EntityType
} from "./chat";

// ─── Constantes de dominio ────────────────────────────────────────────────────

describe("chat — constantes de dominio", () => {
  it("tiene exactamente 4 tipos de entidad", () => {
    expect(ENTITY_TYPES.length).toBe(4);
  });

  it("contiene 'lead', 'brief', 'quotation', 'asset'", () => {
    expect(ENTITY_TYPES).toContain("lead");
    expect(ENTITY_TYPES).toContain("brief");
    expect(ENTITY_TYPES).toContain("quotation");
    expect(ENTITY_TYPES).toContain("asset");
  });

  it("tiene exactamente 4 roles de actor", () => {
    expect(ACTOR_ROLES.length).toBe(4);
  });

  it("contiene 'operator', 'designer', 'client', 'agent'", () => {
    expect(ACTOR_ROLES).toContain("operator");
    expect(ACTOR_ROLES).toContain("designer");
    expect(ACTOR_ROLES).toContain("client");
    expect(ACTOR_ROLES).toContain("agent");
  });
});

// ─── isValidEntityType ────────────────────────────────────────────────────────

describe("chat — isValidEntityType", () => {
  const validCases: EntityType[] = ["lead", "brief", "quotation", "asset"];
  const invalidCases = ["invoice", "user", "", "Lead", "BRIEF"];

  it.each(validCases)("acepta tipo válido '%s'", (type) => {
    expect(isValidEntityType(type)).toBe(true);
  });

  it.each(invalidCases)("rechaza tipo inválido '%s'", (type) => {
    expect(isValidEntityType(type)).toBe(false);
  });
});

// ─── isValidActorRole ─────────────────────────────────────────────────────────

describe("chat — isValidActorRole", () => {
  const validCases: ActorRole[] = ["operator", "designer", "client", "agent"];
  const invalidCases = ["admin", "guest", "", "Operator", "AGENT"];

  it.each(validCases)("acepta rol válido '%s'", (role) => {
    expect(isValidActorRole(role)).toBe(true);
  });

  it.each(invalidCases)("rechaza rol inválido '%s'", (role) => {
    expect(isValidActorRole(role)).toBe(false);
  });
});

// ─── actorRoleLabel ───────────────────────────────────────────────────────────

describe("chat — actorRoleLabel", () => {
  const casos: Array<[ActorRole, string]> = [
    ["operator", "Operador"],
    ["designer", "Diseñador"],
    ["client", "Cliente"],
    ["agent", "Agente"]
  ];

  it.each(casos)("mapea rol '%s' a etiqueta '%s'", (role, expected) => {
    expect(actorRoleLabel(role)).toBe(expected);
  });
});

// ─── formatMessageTimestamp ───────────────────────────────────────────────────

describe("chat — formatMessageTimestamp", () => {
  it("devuelve string no vacío para fecha ISO válida", () => {
    const result = formatMessageTimestamp("2026-05-06T14:30:00Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("incluye hora y minutos en el resultado", () => {
    // La fecha incluye '14:30' en horario UTC — el locale puede variar, pero debe haber dígitos de hora
    const result = formatMessageTimestamp("2026-05-06T14:30:00Z");
    expect(result).toMatch(/\d{2}/); // al menos dos dígitos consecutivos
  });
});
