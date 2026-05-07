/**
 * IMPL-20260506-47
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-47_activo_archivos_y_evidencias_reales.md
 *
 * Tests de las funciones puras de la capa asset-detail.
 * Las funciones async (getFullAssetDetail, insertAssetProposal, uploadEvidenceToStorage)
 * no se testean aqui — requieren DB/Storage.
 */
import { describe, expect, it } from "vitest";

import {
  attachEvidenceToProposals,
  buildCreativeToolSuggestion,
  buildSourceRefs,
  buildV1ProposalDrafts,
  derivePrimaryAndSecondary,
  normalizeEvidenceRow,
  normalizeProposalRow,
  resolveOperativeDecision,
  resolveReviewState,
  type AssetPromptVersion,
  type EvidenceRow,
  type ProposalDraft,
  type ProposalEvidence,
  type ProposalRow
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
  it("devuelve array vacio (funcion de compatibilidad SPEC-45, deprecated en SPEC-46)", () => {
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

// ─── Tests SPEC-46: normalizeProposalRow ─────────────────────────────────────

describe("asset-detail — normalizeProposalRow", () => {
  const baseRow: ProposalRow = {
    id:                "prop-001",
    tenant_id:         "tenant-abc",
    asset_id:          "asset-xyz",
    prompt_version_id: "pv-123",
    is_primary:        true,
    note:              "Propuesta inicial con Firefly",
    tool_used:         "firefly",
    review_decision:   "pending",
    created_at:        "2026-05-06T10:00:00Z"
  };

  it("normaliza correctamente una fila completa", () => {
    const draft = normalizeProposalRow(baseRow);
    expect(draft.id).toBe("prop-001");
    expect(draft.isPrimary).toBe(true);
    expect(draft.note).toBe("Propuesta inicial con Firefly");
    expect(draft.toolUsed).toBe("firefly");
    expect(draft.promptVersionId).toBe("pv-123");
    expect(draft.reviewDecision).toBe("pending");
    expect(draft.createdAt).toBe("2026-05-06T10:00:00Z");
  });

  it("evidence es null y hasEvidence es false por defecto (SPEC-47)", () => {
    const draft = normalizeProposalRow(baseRow);
    expect(draft.evidence).toBeNull();
    expect(draft.hasEvidence).toBe(false);
  });

  it("normaliza prompt_version_id null", () => {
    const draft = normalizeProposalRow({ ...baseRow, prompt_version_id: null });
    expect(draft.promptVersionId).toBeNull();
  });

  it("normaliza is_primary false", () => {
    const draft = normalizeProposalRow({ ...baseRow, is_primary: false });
    expect(draft.isPrimary).toBe(false);
  });

  it("normaliza review_decision approved_internal", () => {
    const draft = normalizeProposalRow({ ...baseRow, review_decision: "approved_internal" });
    expect(draft.reviewDecision).toBe("approved_internal");
  });
});

// ─── Tests SPEC-47: normalizeEvidenceRow ─────────────────────────────────────

describe("asset-detail — normalizeEvidenceRow (SPEC-47)", () => {
  const baseEvidenceRow: EvidenceRow = {
    id:              "ev-001",
    tenant_id:       "tenant-abc",
    asset_id:        "asset-xyz",
    proposal_id:     "prop-001",
    file_name:       "logo_final_v2.png",
    mime_type:       "image/png",
    storage_path:    "tenant-abc/asset-xyz/prop-001/ev-001.png",
    file_size_bytes: 204800,
    uploaded_at:     "2026-05-06T12:00:00Z"
  };

  it("normaliza correctamente una fila completa", () => {
    const ev = normalizeEvidenceRow(baseEvidenceRow);
    expect(ev.id).toBe("ev-001");
    expect(ev.proposalId).toBe("prop-001");
    expect(ev.assetId).toBe("asset-xyz");
    expect(ev.fileName).toBe("logo_final_v2.png");
    expect(ev.mimeType).toBe("image/png");
    expect(ev.storagePath).toBe("tenant-abc/asset-xyz/prop-001/ev-001.png");
    expect(ev.fileSizeBytes).toBe(204800);
    expect(ev.uploadedAt).toBe("2026-05-06T12:00:00Z");
  });

  it("normaliza file_size_bytes null", () => {
    const ev = normalizeEvidenceRow({ ...baseEvidenceRow, file_size_bytes: null });
    expect(ev.fileSizeBytes).toBeNull();
  });

  it("normaliza mime_type pdf", () => {
    const ev = normalizeEvidenceRow({ ...baseEvidenceRow, mime_type: "application/pdf" });
    expect(ev.mimeType).toBe("application/pdf");
  });
});

// ─── Tests SPEC-47: attachEvidenceToProposals ─────────────────────────────────

const makeEvidence = (overrides: Partial<ProposalEvidence>): ProposalEvidence => ({
  id:             "ev-001",
  proposalId:     "p1",
  assetId:        "asset-xyz",
  fileName:       "pieza.png",
  mimeType:       "image/png",
  storagePath:    "path/pieza.png",
  fileSizeBytes:  1024,
  uploadedAt:     "2026-05-06T12:00:00Z",
  signedUrl:      "https://supabase.io/sign/pieza.png?token=abc",
  ...overrides
});

describe("asset-detail — attachEvidenceToProposals (SPEC-47)", () => {
  it("sin evidencias deja proposals sin cambio (evidence null, hasEvidence false)", () => {
    const proposals = [makeProposal({ id: "p1" }), makeProposal({ id: "p2" })];
    const result = attachEvidenceToProposals(proposals, []);
    expect(result[0].hasEvidence).toBe(false);
    expect(result[0].evidence).toBeNull();
    expect(result[1].hasEvidence).toBe(false);
  });

  it("asigna evidencia correctamente por proposalId", () => {
    const proposals = [makeProposal({ id: "p1" }), makeProposal({ id: "p2" })];
    const evidences = [makeEvidence({ proposalId: "p2", fileName: "banner.jpg" })];
    const result = attachEvidenceToProposals(proposals, evidences);
    expect(result[0].hasEvidence).toBe(false);
    expect(result[0].evidence).toBeNull();
    expect(result[1].hasEvidence).toBe(true);
    expect(result[1].evidence?.fileName).toBe("banner.jpg");
  });

  it("si hay multiples evidencias por propuesta, toma la primera (mas reciente, ordenadas desc)", () => {
    const proposals = [makeProposal({ id: "p1" })];
    const evidences = [
      makeEvidence({ id: "ev-new", proposalId: "p1", uploadedAt: "2026-05-06T15:00:00Z", fileName: "v2.png" }),
      makeEvidence({ id: "ev-old", proposalId: "p1", uploadedAt: "2026-05-06T10:00:00Z", fileName: "v1.png" })
    ];
    const result = attachEvidenceToProposals(proposals, evidences);
    expect(result[0].evidence?.id).toBe("ev-new");
    expect(result[0].evidence?.fileName).toBe("v2.png");
  });

  it("no muta el array original de proposals", () => {
    const proposals = [makeProposal({ id: "p1" })];
    const evidences = [makeEvidence({ proposalId: "p1" })];
    const result = attachEvidenceToProposals(proposals, evidences);
    expect(result[0]).not.toBe(proposals[0]);
    expect(proposals[0].hasEvidence).toBe(false);
  });

  it("devuelve array con mismo length que proposals", () => {
    const proposals = [makeProposal({ id: "p1" }), makeProposal({ id: "p2" }), makeProposal({ id: "p3" })];
    const evidences = [makeEvidence({ proposalId: "p1" })];
    const result = attachEvidenceToProposals(proposals, evidences);
    expect(result).toHaveLength(3);
  });

  it("signedUrl null se propaga correctamente", () => {
    const proposals = [makeProposal({ id: "p1" })];
    const evidences = [makeEvidence({ proposalId: "p1", signedUrl: null })];
    const result = attachEvidenceToProposals(proposals, evidences);
    expect(result[0].hasEvidence).toBe(true);
    expect(result[0].evidence?.signedUrl).toBeNull();
  });
});

// ─── Tests SPEC-46: derivePrimaryAndSecondary ─────────────────────────────────

const makeProposal = (overrides: Partial<ProposalDraft>): ProposalDraft => ({
  id:              "p1",
  isPrimary:       false,
  note:            "nota",
  toolUsed:        "firefly",
  promptVersionId: null,
  reviewDecision:  "pending",
  createdAt:       "2026-05-06T10:00:00Z",
  evidence:        null,
  hasEvidence:     false,
  ...overrides
});

describe("asset-detail — derivePrimaryAndSecondary", () => {
  it("sin propuestas devuelve null en primary y secondary", () => {
    const r = derivePrimaryAndSecondary([]);
    expect(r.primary).toBeNull();
    expect(r.secondary).toBeNull();
    expect(r.comparisonNote).toBeNull();
  });

  it("con una sola propuesta, primary es esa y secondary null", () => {
    const p = makeProposal({ id: "p1", isPrimary: true });
    const r = derivePrimaryAndSecondary([p]);
    expect(r.primary?.id).toBe("p1");
    expect(r.secondary).toBeNull();
    expect(r.comparisonNote).toBeNull();
  });

  it("la marcada isPrimary queda como primary", () => {
    const p1 = makeProposal({ id: "p1", isPrimary: false, createdAt: "2026-05-06T11:00:00Z" });
    const p2 = makeProposal({ id: "p2", isPrimary: true,  createdAt: "2026-05-06T09:00:00Z" });
    const r  = derivePrimaryAndSecondary([p1, p2]);
    expect(r.primary?.id).toBe("p2");
    expect(r.secondary?.id).toBe("p1");
  });

  it("sin isPrimary, la mas reciente es primary", () => {
    const p1 = makeProposal({ id: "p1", isPrimary: false, createdAt: "2026-05-06T09:00:00Z" });
    const p2 = makeProposal({ id: "p2", isPrimary: false, createdAt: "2026-05-06T11:00:00Z" });
    const r  = derivePrimaryAndSecondary([p1, p2]);
    expect(r.primary?.id).toBe("p2");
    expect(r.secondary?.id).toBe("p1");
  });

  it("comparisonNote incluye herramientas de primary y secondary", () => {
    const p1 = makeProposal({ id: "p1", isPrimary: true,  toolUsed: "firefly",      createdAt: "2026-05-06T10:00:00Z" });
    const p2 = makeProposal({ id: "p2", isPrimary: false, toolUsed: "adobe_express", createdAt: "2026-05-06T09:00:00Z" });
    const r  = derivePrimaryAndSecondary([p1, p2]);
    expect(r.comparisonNote).toContain("firefly");
    expect(r.comparisonNote).toContain("adobe_express");
  });
});

// ─── Tests SPEC-46: resolveOperativeDecision ─────────────────────────────────

describe("asset-detail — resolveOperativeDecision", () => {
  it("sin propuestas devuelve pending", () => {
    expect(resolveOperativeDecision([])).toBe("pending");
  });

  it("toma la decision de la propuesta marcada isPrimary", () => {
    const proposals = [
      makeProposal({ id: "p1", isPrimary: false, reviewDecision: "needs_adjustment" }),
      makeProposal({ id: "p2", isPrimary: true,  reviewDecision: "approved_internal" })
    ];
    expect(resolveOperativeDecision(proposals)).toBe("approved_internal");
  });

  it("si no hay isPrimary toma la primera del array", () => {
    const proposals = [
      makeProposal({ id: "p1", isPrimary: false, reviewDecision: "in_review" })
    ];
    expect(resolveOperativeDecision(proposals)).toBe("in_review");
  });
});
