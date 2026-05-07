/**
 * IMPL-20260506-45
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-45_vista_detallada_activo_creativo_y_propuestas.md
 *
 * Tests de las funciones puras de la capa asset-detail.
 * Las funciones async (getFullAssetDetail) no se testean aqui — requieren DB.
 */
import { describe, expect, it } from "vitest";

import {
  buildCreativeToolSuggestion,
  buildSourceRefs,
  buildV1ProposalDrafts,
  resolveReviewState,
  type AssetPromptVersion
} from "./asset-detail";

describe("asset-detail — resolveReviewState", () => {
  it("draft -> readyForProduction true, resto false", () => {
    const state = resolveReviewState("draft");
    expect(state.readyForProduction).toBe(true);
    expect(state.inProduction).toBe(false);
    expect(state.readyForReview).toBe(false);
    expect(state.isApproved).toBe(false);
    expect(state.isBlocked).toBe(false);
    expect(state.statusLabel).toBe("Borrador");
    expect(state.currentStatus).toBe("draft");
  });

  it("in_progress -> inProduction true", () => {
    const state = resolveReviewState("in_progress");
    expect(state.inProduction).toBe(true);
    expect(state.readyForProduction).toBe(false);
    expect(state.readyForReview).toBe(false);
    expect(state.statusLabel).toBe("En progreso");
  });

  it("in_review -> readyForReview true", () => {
    const state = resolveReviewState("in_review");
    expect(state.readyForReview).toBe(true);
    expect(state.inProduction).toBe(false);
    expect(state.isApproved).toBe(false);
    expect(state.statusLabel).toBe("En revision");
  });

  it("approved -> isApproved true", () => {
    const state = resolveReviewState("approved");
    expect(state.isApproved).toBe(true);
    expect(state.readyForReview).toBe(false);
    expect(state.statusLabel).toBe("Aprobado");
  });

  it("delivered -> isApproved true", () => {
    expect(resolveReviewState("delivered").isApproved).toBe(true);
    expect(resolveReviewState("delivered").statusLabel).toBe("Entregado");
  });

  it("archived -> todos los flags false", () => {
    const state = resolveReviewState("archived");
    expect(state.readyForProduction).toBe(false);
    expect(state.inProduction).toBe(false);
    expect(state.readyForReview).toBe(false);
    expect(state.isApproved).toBe(false);
    expect(state.statusLabel).toBe("Archivado");
  });

  it("isBlocked siempre false en V1 para todos los estados", () => {
    const statuses = [
      "draft",
      "in_progress",
      "in_review",
      "approved",
      "delivered",
      "archived"
    ] as const;
    statuses.forEach((s) => {
      expect(resolveReviewState(s).isBlocked).toBe(false);
    });
  });
});

describe("asset-detail — buildV1ProposalDrafts", () => {
  it("devuelve array vacio (tabla asset_proposals no existe en V1)", () => {
    expect(buildV1ProposalDrafts()).toEqual([]);
  });

  it("devuelve un array nuevo en cada llamada", () => {
    const a = buildV1ProposalDrafts();
    const b = buildV1ProposalDrafts();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe("asset-detail — buildSourceRefs", () => {
  it("devuelve array vacio para prompt null", () => {
    expect(buildSourceRefs(null)).toEqual([]);
  });

  it("devuelve array vacio si referencesJson es null", () => {
    const prompt = { referencesJson: null } as unknown as AssetPromptVersion;
    expect(buildSourceRefs(prompt)).toEqual([]);
  });

  it("extrae todas las entradas del referencesJson", () => {
    const prompt = {
      referencesJson: { brief_id: "abc123", style: "minimalista" }
    } as unknown as AssetPromptVersion;
    const refs = buildSourceRefs(prompt);
    expect(refs).toHaveLength(2);
    expect(refs.find((r) => r.key === "brief_id")?.value).toBe("abc123");
    expect(refs.find((r) => r.key === "style")?.value).toBe("minimalista");
  });

  it("omite entradas con valor null", () => {
    const prompt = {
      referencesJson: { key_real: "valor", key_null: null }
    } as unknown as AssetPromptVersion;
    const refs = buildSourceRefs(prompt);
    expect(refs).toHaveLength(1);
    expect(refs[0].key).toBe("key_real");
    expect(refs[0].value).toBe("valor");
  });

  it("convierte valores numericos a string", () => {
    const prompt = {
      referencesJson: { version: 3 }
    } as unknown as AssetPromptVersion;
    const refs = buildSourceRefs(prompt);
    expect(refs[0].value).toBe("3");
  });
});

describe("asset-detail — buildCreativeToolSuggestion", () => {
  it("imagen sugiere firefly con label correcto", () => {
    const s = buildCreativeToolSuggestion("imagen");
    expect(s.tool).toBe("firefly");
    expect(s.label).toBe("Adobe Firefly");
    expect(s.description).toBeTruthy();
  });

  it("banner sugiere firefly", () => {
    expect(buildCreativeToolSuggestion("banner").tool).toBe("firefly");
  });

  it("portada sugiere firefly", () => {
    expect(buildCreativeToolSuggestion("portada").tool).toBe("firefly");
  });

  it("carousel sugiere adobe_express", () => {
    expect(buildCreativeToolSuggestion("carousel").tool).toBe("adobe_express");
  });

  it("historia sugiere adobe_express", () => {
    expect(buildCreativeToolSuggestion("historia").tool).toBe("adobe_express");
  });

  it("reel sugiere adobe_express", () => {
    expect(buildCreativeToolSuggestion("reel").tool).toBe("adobe_express");
  });

  it("copy sugiere other", () => {
    const s = buildCreativeToolSuggestion("copy");
    expect(s.tool).toBe("other");
    expect(s.label).toBe("Herramienta de texto");
  });

  it("anuncio_texto sugiere other", () => {
    expect(buildCreativeToolSuggestion("anuncio_texto").tool).toBe("other");
  });

  it("todo codigo de pieza tiene label y description definidos", () => {
    const codes = [
      "imagen",
      "video",
      "carousel",
      "historia",
      "reel",
      "anuncio_texto",
      "banner",
      "portada",
      "copy",
      "landing_section"
    ];
    codes.forEach((code) => {
      const s = buildCreativeToolSuggestion(code);
      expect(s.label, `label para ${code}`).toBeTruthy();
      expect(s.description, `description para ${code}`).toBeTruthy();
    });
  });
});
