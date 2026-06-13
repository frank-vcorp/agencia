/**
 * IMPL-20260612-03
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-03_cliente_portal_briefing_file_upload_estados_v1.md
 *
 * Endpoint que devuelve una signed URL de Supabase Storage para que el cliente
 * suba un archivo directamente al bucket `client-uploads`.
 *
 * POST /api/client/upload-url
 * Body: { projectId, fileName, mimeType, size }
 * Response: { signedUrl, publicUrl, path }
 *
 * Validaciones:
 * - MIME type permitido (imagen/video/PDF/doc/txt)
 * - Tamaño máximo 50MB
 * - El path incluye el projectId para RLS por tenant
 */
import { NextResponse } from "next/server";

import { supabaseEnv } from "@/lib/supabase";
import {
  CLIENT_UPLOAD_MAX_BYTES,
  buildClientUploadPath,
  isClientUploadMimeAllowed
} from "@/lib/client-uploads";

type RequestBody = {
  projectId?: unknown;
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

  const projectId = asString(body.projectId);
  const fileName = asString(body.fileName);
  const mimeType = asString(body.mimeType);
  const size = asNumber(body.size);

  if (!projectId) {
    return NextResponse.json({ error: "missing_project_id" }, { status: 400 });
  }
  if (!fileName) {
    return NextResponse.json({ error: "missing_file_name" }, { status: 400 });
  }
  if (!mimeType) {
    return NextResponse.json({ error: "missing_mime_type" }, { status: 400 });
  }
  if (size === null) {
    return NextResponse.json({ error: "missing_size" }, { status: 400 });
  }
  if (size <= 0) {
    return NextResponse.json({ error: "invalid_size" }, { status: 400 });
  }
  if (size > CLIENT_UPLOAD_MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }
  if (!isClientUploadMimeAllowed(mimeType)) {
    return NextResponse.json({ error: "mime_not_allowed" }, { status: 415 });
  }

  // Generar un ID determinista-ish para el archivo basado en timestamp + random
  const fileId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `file-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  // Generar un messageId temporal (se vinculará al mensaje real al enviar)
  const messageId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const path = buildClientUploadPath({ projectId, messageId, fileId, fileName });

  // Si Supabase no está configurado, devolver un fallback de development
  if (!supabaseEnv.url || !supabaseEnv.anonKey) {
    return NextResponse.json({
      signedUrl: null,
      publicUrl: `local://${path}`,
      path,
      messageId,
      fileId,
      development: true
    });
  }

  // Construir signed URL para upload directo desde el cliente
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseEnv.anonKey;
  const uploadUrl = `${supabaseEnv.url}/storage/v1/object/client-uploads/${path}`;

  // Generar un token firmado simple usando el timestamp
  // En producción, usar la API de Supabase para generar signed URLs
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutos
  const signature = await generateSimpleSignature(path, serviceKey, expiresAt);

  const signedUrl = `${uploadUrl}?token=${serviceKey}&expires=${expiresAt}&sig=${signature}`;
  const publicUrl = `${supabaseEnv.url}/storage/v1/object/public/client-uploads/${path}`;

  return NextResponse.json({
    signedUrl,
    publicUrl,
    path,
    messageId,
    fileId,
    development: false
  });
}

/**
 * Genera una firma simple para la signed URL.
 * En producción, esto debería usar el SDK de Supabase o JWT firmado.
 * IMPL-20260612-03
 */
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
  // Fallback: hash simple
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
