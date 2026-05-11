/**
 * IMPL-20260510-10
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-10_extension_mcp_cotizaciones_y_copias_locales.md
 *
 * GET /api/v1/projects/[id]/brief
 * Retorna el brief consolidado de un proyecto para los agentes MCP.
 * Auth: Bearer <BRIDGE_MCP_SECRET>
 */
import { NextRequest, NextResponse } from "next/server";

import { getTenantIdBySlug } from "@/lib/assets";
import { verifyAgentToken, getTenantSlug } from "@/lib/agent-auth";
import { supabaseEnv } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// ─── Tipos internos ────────────────────────────────────────────────────────────

type ProjectRow = {
  id: string;
  name: string;
  status: string;
  client_id: string | null;
};

type BriefRow = {
  id: string;
  status: string;
};

type BriefVersionRow = {
  final_summary_text: string | null;
  structured_summary_json: Record<string, string> | null;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getServerKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseEnv.anonKey;
}

async function pgrest<T>(path: string, init?: RequestInit): Promise<T> {
  const key = getServerKey();
  const res = await fetch(`${supabaseEnv.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!res.ok) {
    throw new Error(`supabase_error:${res.status}`);
  }

  if (res.status === 204) return [] as T;
  return (await res.json()) as T;
}

function mapBriefStatus(dbStatus: string): string {
  if (dbStatus === "approved_locked" || dbStatus === "superseded") return "completed";
  if (dbStatus === "draft" || dbStatus === "returned_for_rework") return "draft";
  return "in_progress";
}

function splitToArray(value: string | null | undefined): string[] {
  if (!value || value.trim() === "") return [];
  return value
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─── Handler ───────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authError = verifyAgentToken(req);
  if (authError) return authError;

  const { id } = await params;
  const slug = getTenantSlug(req);
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  // Verificar que el proyecto existe y pertenece al tenant
  const projectParams = new URLSearchParams({
    select: "id,name,status,client_id",
    id: `eq.${id}`,
    tenant_id: `eq.${tenantId}`,
    limit: "1"
  });

  const projectRows = await pgrest<ProjectRow[]>(
    `projects?${projectParams.toString()}`,
    { method: "GET" }
  ).catch(() => [] as ProjectRow[]);

  if (!projectRows[0]) {
    return NextResponse.json({ ok: false, error: "project_not_found" }, { status: 404 });
  }

  const project = projectRows[0];

  // Buscar el brief vinculado al proyecto
  const briefParams = new URLSearchParams({
    select: "id,status",
    project_id: `eq.${id}`,
    tenant_id: `eq.${tenantId}`,
    order: "created_at.desc",
    limit: "1"
  });

  const briefRows = await pgrest<BriefRow[]>(
    `briefs?${briefParams.toString()}`,
    { method: "GET" }
  ).catch(() => [] as BriefRow[]);

  if (!briefRows[0]) {
    return NextResponse.json({ ok: false, error: "brief_not_found" }, { status: 404 });
  }

  const brief = briefRows[0];

  // Obtener la última versión del brief
  const versionParams = new URLSearchParams({
    select: "final_summary_text,structured_summary_json",
    brief_id: `eq.${brief.id}`,
    order: "version_number.desc",
    limit: "1"
  });

  const versionRows = await pgrest<BriefVersionRow[]>(
    `brief_versions?${versionParams.toString()}`,
    { method: "GET" }
  ).catch(() => [] as BriefVersionRow[]);

  const version = versionRows[0] ?? null;
  const structured = version?.structured_summary_json ?? {};
  const rawContent = version?.final_summary_text ?? "";

  return NextResponse.json({
    ok: true,
    project: { id: project.id, name: project.name },
    brief: {
      status: mapBriefStatus(brief.status),
      summary: structured["projectObjective"] ?? rawContent.slice(0, 500),
      objectives: splitToArray(structured["projectObjective"] ?? null),
      targetAudience: structured["audience"] ?? "",
      tone: structured["tone"] ?? "",
      references: splitToArray(structured["references"] ?? null),
      constraints: splitToArray(structured["restrictions"] ?? null),
      rawContent
    }
  });
}
