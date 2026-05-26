/**
 * IMPL-20260510-14
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-14_mcp_crear_cliente_proyecto_activo.md
 * IMPL-20260526-04
 * Respaldo: context/SPECs/SPEC_ARCH-20260526-04_mcp_crud_logico_entidades_v1.md
 *
 * GET  /api/v1/projects — Lista proyectos del tenant
 * POST /api/v1/projects — Crea un nuevo proyecto en el tenant activo
 * Auth: Bearer <BRIDGE_MCP_SECRET>
 */
import { NextRequest, NextResponse } from "next/server";

import { getTenantIdBySlug, createProject, getProjectsByTenant } from "@/lib/assets";
import { verifyAgentToken, getTenantSlug } from "@/lib/agent-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authError = verifyAgentToken(req);
  if (authError) return authError;

  const slug = getTenantSlug(req);
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  try {
    const projects = await getProjectsByTenant(tenantId);
    return NextResponse.json({ ok: true, projects }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authError = verifyAgentToken(req);
  if (authError) return authError;

  const slug = getTenantSlug(req);
  const tenantId = await getTenantIdBySlug(slug);
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "tenant_not_found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.clientId || typeof body.clientId !== "string") {
    return NextResponse.json({ ok: false, error: "clientId_required" }, { status: 400 });
  }
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
  }
  if (!body.projectType || typeof body.projectType !== "string") {
    return NextResponse.json({ ok: false, error: "projectType_required" }, { status: 400 });
  }

  const validProjectTypes = ["lanzamiento", "presencia", "contenido", "campana", "interno"] as const;
  if (!validProjectTypes.includes(body.projectType as (typeof validProjectTypes)[number])) {
    return NextResponse.json({ ok: false, error: "projectType_invalid" }, { status: 400 });
  }

  try {
    const project = await createProject(tenantId, {
      clientId: body.clientId as string,
      name: body.name as string,
      projectType: body.projectType as "lanzamiento" | "presencia" | "contenido" | "campana" | "interno",
      objective: typeof body.objective === "string" ? body.objective : undefined,
      status: body.status as "draft" | "active" | "paused" | "completed" | "archived" | undefined,
      startDate: typeof body.startDate === "string" ? body.startDate : undefined,
      endDate: typeof body.endDate === "string" ? body.endDate : undefined
    });

    return NextResponse.json(
      {
        ok: true,
        projectId: project.id,
        name: project.name,
        projectType: project.project_type,
        status: project.status,
        clientId: project.client_id,
        message: `Proyecto "${project.name}" creado exitosamente.`
      },
      { status: 201 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "name_conflict") {
      return NextResponse.json({ ok: false, error: "name_conflict" }, { status: 409 });
    }
    if (msg.includes("foreign key") || msg.includes("23503")) {
      return NextResponse.json({ ok: false, error: "client_not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
