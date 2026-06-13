/**
 * IMPL-20260612-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-02_disenador_estacion_creativa_refinada_firefly_versionado_v1.md
 *
 * Helpers para la integración con Adobe Firefly:
 * - Deep link builder (prompt + aspect ratio + referencias)
 * - Mapeo de formatCode → aspect ratio
 * - Niveles de versionado visual para propuestas
 */

import type { CreativeTool } from "@/lib/designer-workspace";

/**
 * Mapea un formatCode del catálogo P0 a un aspect ratio (width / height).
 * IMPL-20260612-02
 */
export function parseFormatToAspectRatio(formatCode: string): number {
  const map: Record<string, number> = {
    cuadrado_1_1: 1,
    vertical_4_5: 4 / 5,
    vertical_9_16: 9 / 16,
    horizontal_16_9: 16 / 9,
    display_responsive: 16 / 9
  };
  return map[formatCode] ?? 1;
}

/**
 * Mapea pieceTypeCode a contentType de Firefly.
 * IMPL-20260612-02
 */
export function pieceTypeToFireflyContentType(
  pieceTypeCode: string
): "image" | "video" | "text" {
  if (pieceTypeCode === "video" || pieceTypeCode === "reel") return "video";
  if (pieceTypeCode === "copy" || pieceTypeCode === "anuncio_texto") return "text";
  return "image";
}

/**
 * Construye un deep link de Adobe Firefly con prompt, aspect ratio y referencias.
 * IMPL-20260612-02
 */
export function buildFireflyDeepLink(params: {
  prompt: string;
  aspectRatio: number;
  referenceImages: string[];
  contentType: "image" | "video" | "text";
}): string {
  const base = "https://firefly.adobe.com/create";
  const query = new URLSearchParams({
    prompt: params.prompt,
    ar: params.aspectRatio.toFixed(2)
  });
  if (params.referenceImages.length > 0) {
    query.set("refs", params.referenceImages.join(","));
  }
  query.set("mode", params.contentType);
  return `${base}?${query.toString()}`;
}

/**
 * Niveles visuales de versionado para propuestas de diseñador.
 * IMPL-20260612-02
 */
export type DraftLevel =
  | "exploration"
  | "candidate"
  | "approved_designer"
  | "approved_final";

/**
 * Determina el nivel visual de una propuesta basado en su reviewDecision
 * y si es la candidata principal.
 * IMPL-20260612-02
 */
export function getDraftLevel(
  draft: { reviewDecision: string; isPrimary: boolean }
): DraftLevel {
  if (draft.reviewDecision === "approved_final") return "approved_final";
  if (draft.reviewDecision === "approved_designer") return "approved_designer";
  if (draft.reviewDecision === "pending" && draft.isPrimary) return "candidate";
  return "exploration";
}

export const DRAFT_LEVEL_LABELS: Record<DraftLevel, string> = {
  exploration: "Exploracion",
  candidate: "Candidata",
  approved_designer: "Aprobada Diseno",
  approved_final: "Entregada"
};

export const DRAFT_LEVEL_STYLES: Record<
  DraftLevel,
  { bg: string; ring: string; badge: string; text: string }
> = {
  exploration: {
    bg: "bg-slate-50",
    ring: "ring-slate-200",
    badge: "bg-slate-100 text-slate-700",
    text: "text-slate-700"
  },
  candidate: {
    bg: "bg-amber-50",
    ring: "ring-amber-200",
    badge: "bg-amber-100 text-amber-800",
    text: "text-amber-800"
  },
  approved_designer: {
    bg: "bg-emerald-50",
    ring: "ring-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
    text: "text-emerald-800"
  },
  approved_final: {
    bg: "bg-sky-50",
    ring: "ring-sky-200",
    badge: "bg-sky-100 text-sky-800",
    text: "text-sky-800"
  }
};

/**
 * Construye la URL de callback de Firefly para enviar resultados a Bridge.
 * IMPL-20260612-02
 */
export function buildFireflyCallbackUrl(baseUrl: string, assetId: string): string {
  const url = new URL("/api/firefly/callback", baseUrl);
  url.searchParams.set("assetId", assetId);
  return url.toString();
}

/**
 * Tipo de payload que Firefly envía al callback de Bridge.
 * IMPL-20260612-02
 */
export type FireflyCallbackPayload = {
  assetId: string;
  generatedImages?: string[];
  generatedVideo?: string;
  metadata?: Record<string, unknown>;
  promptUsed?: string;
};

export type { CreativeTool };
