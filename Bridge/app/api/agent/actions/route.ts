/**
 * IMPL-20260612-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-01_operador_dashboard_acciones_crud_comentarios_agente_v1.md
 *
 * Endpoint de salida para que el operador dispare acciones al agente remoto (VS Code).
 *
 * POST /api/agent/actions
 * Headers: Authorization: Bearer <service-token>
 * Body: { action: AgentActionType, projectId, payload }
 * Response: { actionId, status: "dispatched" }
 */
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { supabaseEnv, isSupabaseConfigured } from "@/lib/supabase";
import type { AgentActionType } from "@/lib/operator-comments";

type ActionBody = {
  action?: unknown;
  projectId?: unknown;
  payload?: unknown;
};

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function asActionType(v: unknown): AgentActionType | null {
  const valid: AgentActionType[] = [
    "sync_context",
    "regenerate_snapshot",
    "create_asset",
    "draft_brief",
    "draft_quotation"
  ];
  if (typeof v === "string" && (valid as string[]).includes(v)) {
    return v as AgentActionType;
  }
  return null;
}

function asObject(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

export async function POST(request: Request) {
  // Verificar token de servicio
  const authHeader = request.headers.get("authorization") ?? "";
  const expectedToken = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev-service-token";
  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice(7);
  if (token !== expectedToken && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const action = asActionType(body.action);
  const projectId = asString(body.projectId);
  const payload = asObject(body.payload);

  if (!action) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }
  if (!projectId) {
    return NextResponse.json({ error: "missing_project_id" }, { status: 400 });
  }

  const actionId = randomUUID();
  const now = new Date().toISOString();

  if (!isSupabaseConfigured || !supabaseEnv.url) {
    console.log("[agent-actions] dev mode, no dispatch", { actionId, action, projectId });
    return NextResponse.json({
      actionId,
      status: "dispatched" as const,
      development: true
    });
  }

  // Persistir acción y "dispatchar" al agente
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseEnv.anonKey;
    const response = await fetch(`${supabaseEnv.url}/rest/v1/agent_actions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        id: actionId,
        type: action,
        project_id: projectId,
        payload,
        status: "dispatched",
        dispatched_at: now
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[agent-actions] supabase insert failed", errorText);
    }

    // En producción, aquí se haría un POST al endpoint del agente
    // Por ahora, solo registramos
    const agentEndpoint = process.env.AGENT_DISPATCH_URL;
    if (agentEndpoint) {
      try {
        await fetch(agentEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.AGENT_TOKEN ?? ""}`
          },
          body: JSON.stringify({ actionId, action, projectId, payload })
        });
      } catch (err) {
        console.warn("[agent-actions] dispatch to agent endpoint failed", err);
      }
    }

    return NextResponse.json({
      actionId,
      status: "dispatched" as const
    });
  } catch (err) {
    console.error("[agent-actions] error", err);
    return NextResponse.json(
      { error: "internal_error", message: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
