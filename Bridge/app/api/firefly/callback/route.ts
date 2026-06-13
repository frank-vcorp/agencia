/**
 * IMPL-20260612-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-02_disenador_estacion_creativa_refinada_firefly_versionado_v1.md
 *
 * Endpoint de callback para Adobe Firefly.
 * Cuando el diseñador genera contenido en Firefly y hace "Enviar a Bridge",
 * Firefly POSTea a este endpoint con las imágenes/video generados.
 *
 * POST /api/firefly/callback
 * Headers: Authorization: Bearer <service-token>
 * Body: {
 *   assetId: string;
 *   generatedImages?: string[];
 *   generatedVideo?: string;
 *   metadata?: { model, seed, steps, ... };
 *   promptUsed?: string;
 * }
 * Response: { proposalDraftId, status: "created" }
 */
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { supabaseEnv } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase";

type CallbackBody = {
  assetId?: unknown;
  generatedImages?: unknown;
  generatedVideo?: unknown;
  metadata?: unknown;
  promptUsed?: unknown;
};

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function asObject(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

function verifyServiceToken(request: Request): boolean {
  const authHeader = request.headers.get("authorization") ?? "";
  const expectedToken = process.env.FIREFLY_CALLBACK_TOKEN ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!expectedToken) {
    // En desarrollo sin token configurado, permitir (log warning)
    console.warn("[firefly-callback] No service token configured, allowing in dev mode");
    return true;
  }
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  return token === expectedToken;
}

export async function POST(request: Request) {
  if (!verifyServiceToken(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: CallbackBody;
  try {
    body = (await request.json()) as CallbackBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const assetId = asString(body.assetId);
  if (!assetId) {
    return NextResponse.json({ error: "missing_asset_id" }, { status: 400 });
  }

  const generatedImages = asStringArray(body.generatedImages);
  const generatedVideo = asString(body.generatedVideo);
  const metadata = asObject(body.metadata);
  const promptUsed = asString(body.promptUsed);

  const proposalDraftId = randomUUID();
  const now = new Date().toISOString();

  // En producción, persistiríamos el ProposalDraft en Supabase
  // Por ahora, registramos en logs y devolvemos éxito
  if (!isSupabaseConfigured || !supabaseEnv.url) {
    console.log("[firefly-callback] dev mode, no persistence", {
      proposalDraftId,
      assetId,
      generatedImagesCount: generatedImages.length,
      hasVideo: Boolean(generatedVideo),
      now
    });
    return NextResponse.json({
      proposalDraftId,
      status: "created",
      note: "Development mode: no persistence"
    });
  }

  // Construir payload para insertar en asset_proposals
  const evidenceUrls = [...generatedImages];
  if (generatedVideo) evidenceUrls.push(generatedVideo);

  const proposalPayload = {
    id: proposalDraftId,
    asset_id: assetId,
    is_primary: true,
    note: promptUsed
      ? `Generado via Firefly deep link — ${promptUsed.slice(0, 100)}`
      : "Generado via Firefly deep link",
    tool_used: "firefly",
    review_decision: "pending",
    metadata: { ...metadata, firefly_callback: true, evidence_urls: evidenceUrls },
    created_at: now
  };

  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseEnv.anonKey;
    const response = await fetch(`${supabaseEnv.url}/rest/v1/asset_proposals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: "return=representation"
      },
      body: JSON.stringify(proposalPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[firefly-callback] supabase insert failed", errorText);
      return NextResponse.json(
        { error: "persistence_failed", detail: errorText },
        { status: 502 }
      );
    }

    return NextResponse.json({
      proposalDraftId,
      status: "created"
    });
  } catch (err) {
    console.error("[firefly-callback] error", err);
    return NextResponse.json(
      { error: "internal_error", message: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
