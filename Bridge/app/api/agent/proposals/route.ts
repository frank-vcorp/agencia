/**
 * IMPL-20260612-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-01_operador_dashboard_acciones_crud_comentarios_agente_v1.md
 *
 * Endpoint de entrada para propuestas estructuradas del agente remoto (VS Code).
 *
 * POST /api/agent/proposals
 * Headers: Authorization: Bearer <agent-token>, X-Agent-ID: <id>
 * Body: AgentProposal (sin id, status, receivedAt)
 * Response: { proposalId, status: "pending" }
 */
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { supabaseEnv, isSupabaseConfigured } from "@/lib/supabase";
import type { AgentProposal, AgentProposalType } from "@/lib/operator-comments";

type ProposalBody = {
  type?: unknown;
  payload?: unknown;
  projectId?: unknown;
  summary?: unknown;
  diff?: unknown;
  agentId?: unknown;
};

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function asProposalType(v: unknown): AgentProposalType | null {
  const valid: AgentProposalType[] = [
    "create_asset",
    "draft_brief",
    "draft_quotation",
    "sync_context",
    "regenerate_snapshot"
  ];
  if (typeof v === "string" && (valid as string[]).includes(v)) {
    return v as AgentProposalType;
  }
  return null;
}

function asObject(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

function verifyAgentToken(request: Request): { valid: boolean; agentId: string | null } {
  const authHeader = request.headers.get("authorization") ?? "";
  const expectedToken =
    process.env.AGENT_TOKEN ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev-agent-token";
  const agentIdHeader = request.headers.get("x-agent-id");

  if (!authHeader.startsWith("Bearer ")) {
    return { valid: false, agentId: agentIdHeader };
  }
  const token = authHeader.slice(7);
  if (token !== expectedToken) {
    return { valid: false, agentId: agentIdHeader };
  }
  return { valid: true, agentId: agentIdHeader };
}

export async function POST(request: Request) {
  const { valid, agentId } = verifyAgentToken(request);

  // En desarrollo sin token configurado, permitir
  if (!valid && process.env.AGENT_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: ProposalBody;
  try {
    body = (await request.json()) as ProposalBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const type = asProposalType(body.type);
  const projectId = asString(body.projectId);
  const summary = asString(body.summary);
  const payload = asObject(body.payload);
  const diff = asObject(body.diff);

  if (!type) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  if (!projectId) {
    return NextResponse.json({ error: "missing_project_id" }, { status: 400 });
  }

  const proposalId = randomUUID();
  const now = new Date().toISOString();

  const proposal: AgentProposal = {
    id: proposalId,
    type,
    payload,
    status: "pending",
    receivedAt: now,
    agentId: agentId ?? "unknown-agent",
    projectId,
    summary: summary ?? `${type} para proyecto ${projectId}`,
    diff: Object.keys(diff).length > 0
      ? (diff as Record<string, { before: unknown; after: unknown }>)
      : undefined
  };

  if (!isSupabaseConfigured || !supabaseEnv.url) {
    console.log("[agent-proposals] dev mode, no persistence", proposalId);
    return NextResponse.json({
      proposalId,
      status: "pending" as const,
      development: true
    });
  }

  // Persistir en Supabase
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseEnv.anonKey;
    const response = await fetch(`${supabaseEnv.url}/rest/v1/agent_proposals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        id: proposalId,
        type,
        project_id: projectId,
        agent_id: proposal.agentId,
        status: "pending",
        payload,
        summary: proposal.summary,
        diff: diff ?? null,
        received_at: now
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[agent-proposals] supabase insert failed", errorText);
      // Devolver éxito de todos modos (la propuesta se loguea)
      return NextResponse.json({
        proposalId,
        status: "pending" as const,
        warning: "persistence_failed",
        detail: errorText
      });
    }

    return NextResponse.json({
      proposalId,
      status: "pending" as const
    });
  } catch (err) {
    console.error("[agent-proposals] error", err);
    return NextResponse.json(
      { error: "internal_error", message: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
