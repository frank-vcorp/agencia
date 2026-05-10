/**
 * IMPL-20260510-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-03_chat_asistente_produccion_disenador.md
 *
 * Route handler para el asistente de produccion creativa del diseñador.
 * GEMINI_API_KEY solo se usa server-side — nunca sale al cliente.
 */
import { NextRequest, NextResponse } from "next/server";

import { callGemini, type AssetContext } from "@/lib/designer-chat";

// ─── Rate limiting en memoria (max 20 req/min por IP) ────────────────────────

type RateEntry = { count: number; resetAt: number };
const rateLimitMap = new Map<string, RateEntry>();
const RATE_LIMIT_MAX = 20;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count += 1;
  return false;
}

// ─── POST /api/designer-chat ──────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Obtener IP para rate limiting (funciona en Vercel y local)
  const forwardedFor = req.headers.get("x-forwarded-for");
  const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un momento." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de peticion invalido." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Cuerpo de peticion invalido." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  // Validar message
  const message = raw.message;
  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "El campo message es requerido." }, { status: 400 });
  }
  if (message.length > 500) {
    return NextResponse.json(
      { error: "El mensaje supera el limite de 500 caracteres." },
      { status: 400 }
    );
  }

  // Extraer assetContext opcional
  let assetContext: AssetContext | undefined;
  if (raw.assetContext !== undefined && raw.assetContext !== null) {
    const ctx = raw.assetContext;
    if (
      typeof ctx === "object" &&
      ctx !== null &&
      "tool" in ctx &&
      "promptText" in ctx &&
      "format" in ctx &&
      "name" in ctx &&
      typeof (ctx as Record<string, unknown>).tool === "string" &&
      typeof (ctx as Record<string, unknown>).promptText === "string" &&
      typeof (ctx as Record<string, unknown>).format === "string" &&
      typeof (ctx as Record<string, unknown>).name === "string"
    ) {
      const c = ctx as Record<string, string>;
      assetContext = {
        tool: c.tool,
        promptText: c.promptText,
        format: c.format,
        name: c.name
      };
    }
  }

  // Extraer imagen opcional
  const imageBase64 =
    typeof raw.imageBase64 === "string" ? raw.imageBase64 : undefined;
  const imageMimeType =
    typeof raw.imageMimeType === "string" ? raw.imageMimeType : undefined;

  const reply = await callGemini(
    message.trim(),
    assetContext,
    imageBase64,
    imageMimeType
  );

  return NextResponse.json({ reply });
}
