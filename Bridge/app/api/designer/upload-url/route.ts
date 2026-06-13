/**
 * IMPL-20260612-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-02_disenador_estacion_creativa_refinada_firefly_versionado_v1.md
 *
 * Endpoint que devuelve una signed URL de Supabase Storage para que el diseñador
 * suba archivos de referencia visual (imágenes, videos) para un activo.
 *
 * POST /api/designer/upload-url
 * Body: { assetId, fileName, mimeType, size }
 * Response: { signedUrl, publicUrl, path }
 */
import { NextResponse } from "next/server";

import { supabaseEnv } from "@/lib/supabase";

const MAX_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_PREFIXES = ["image/", "video/"];

type RequestBody = {
  assetId?: unknown;
  fileName?: unknown;
  mimeType?: unknown;
  size?: unknown;
};

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const assetId = asString(body.assetId);
  const fileName = asString(body.fileName);
  const mimeType = asString(body.mimeType);
  const size = asNumber(body.size);

  if (!assetId) return NextResponse.json({ error: "missing_asset_id" }, { status: 400 });
  if (!fileName) return NextResponse.json({ error: "missing_file_name" }, { status: 400 });
  if (!mimeType) return NextResponse.json({ error: "missing_mime_type" }, { status: 400 });
  if (size === null) return NextResponse.json({ error: "missing_size" }, { status: 400 });
  if (size <= 0) return NextResponse.json({ error: "invalid_size" }, { status: 400 });
  if (size > MAX_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 413 });

  const isAllowed = ALLOWED_MIME_PREFIXES.some(
    (prefix) => mimeType === prefix || mimeType.startsWith(prefix)
  );
  if (!isAllowed) {
    return NextResponse.json({ error: "mime_not_allowed" }, { status: 415 });
  }

  const fileId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `ref-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_").slice(0, 80);
  const path = `asset-references/${assetId}/${fileId}-${sanitized}`;

  if (!supabaseEnv.url || !supabaseEnv.anonKey) {
    return NextResponse.json({
      signedUrl: null,
      publicUrl: `local://${path}`,
      path,
      fileId,
      development: true
    });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseEnv.anonKey;
  const uploadUrl = `${supabaseEnv.url}/storage/v1/object/asset-references/${path}`;
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 10;
  const signature = await generateSimpleSignature(path, serviceKey, expiresAt);

  const signedUrl = `${uploadUrl}?token=${serviceKey}&expires=${expiresAt}&sig=${signature}`;
  const publicUrl = `${supabaseEnv.url}/storage/v1/object/public/asset-references/${path}`;

  return NextResponse.json({
    signedUrl,
    publicUrl,
    path,
    fileId,
    development: false
  });
}

async function generateSimpleSignature(
  path: string,
  key: string,
  expiresAt: number
): Promise<string> {
  const data = `${path}:${expiresAt}:${key}`;
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const dataBytes = encoder.encode(data);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, dataBytes);
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
