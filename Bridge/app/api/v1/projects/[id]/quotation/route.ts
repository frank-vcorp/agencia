/**
 * IMPL-20260510-10
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-10_extension_mcp_cotizaciones_y_copias_locales.md
 *
 * POST /api/v1/projects/[id]/quotation
 * Crea o actualiza la cotización de un proyecto desde el agente MCP.
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
  client_id: string | null;
};

type QuotationRow = {
  id: string;
  status: string;
  active_version_id: string | null;
};

type QuotationVersionRow = {
  id: string;
  version_number: number;
  admin_status: string;
};

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  currency: "MXN" | "USD";
};

type QuotationInput = {
  title: string;
  summaryText: string;
  lineItems: LineItem[];
  validUntil: string;
  notes?: string;
  setAsActive?: boolean;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getServerKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseEnv.anonKey;
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
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(`supabase_error:${res.status}:${JSON.stringify(body)}`);
  }

  if (res.status === 204) return [] as T;
  return (await res.json()) as T;
}

function buildQuotationMarkdown(
  title: string,
  summaryText: string,
  lineItems: LineItem[],
  validUntil: string,
  notes?: string
): string {
  const primaryCurrency = lineItems[0]?.currency ?? "MXN";

  const rows = lineItems.map((item) => {
    const subtotal = (item.quantity * item.unitPrice).toLocaleString("es-MX");
    const unit = item.unitPrice.toLocaleString("es-MX");
    return `| ${item.description} | ${item.quantity} | $${unit} | $${subtotal} | ${item.currency} |`;
  });

  const total = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const lines = [
    `# ${title}`,
    ``,
    summaryText,
    ``,
    `## Desglose de servicios`,
    ``,
    `| Descripción | Cantidad | Precio Unitario | Subtotal | Moneda |`,
    `|-------------|----------|-----------------|----------|--------|`,
    ...rows,
    ``,
    `**Total: $${total.toLocaleString("es-MX")} ${primaryCurrency}**`,
    ``,
    `**Válido hasta:** ${validUntil}`
  ];

  if (notes) {
    lines.push(``, `## Notas`, notes);
  }

  return lines.join("\n");
}

function buildCommercialSummaryJson(
  total: number,
  currency: string,
  summaryText: string,
  lineItems: LineItem[],
  notes?: string
): Record<string, unknown> {
  return {
    totalEstimado: `$${total.toLocaleString("es-MX")} ${currency}`,
    plazo: "Por definir",
    alcance: summaryText.trim(),
    incluye: lineItems.map((item) => item.description.trim()),
    nota: notes?.trim() || "Sin notas adicionales"
  };
}

// ─── Handler ───────────────────────────────────────────────────────────────────

export async function POST(
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

  // Parsear body
  let input: QuotationInput;
  try {
    input = (await req.json()) as QuotationInput;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { title, summaryText, lineItems, validUntil, notes, setAsActive } = input;

  if (!title || !summaryText || !lineItems || !validUntil) {
    return NextResponse.json(
      { ok: false, error: "missing_required_fields: title, summaryText, lineItems, validUntil" },
      { status: 400 }
    );
  }

  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return NextResponse.json(
      { ok: false, error: "lineItems debe ser un array no vacío" },
      { status: 400 }
    );
  }

  // Verificar que el proyecto existe y pertenece al tenant
  const projectParams = new URLSearchParams({
    select: "id,name,client_id",
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

  // Buscar cotización existente para este proyecto
  const quotParams = new URLSearchParams({
    select: "id,status,active_version_id",
    project_id: `eq.${id}`,
    tenant_id: `eq.${tenantId}`,
    order: "created_at.desc",
    limit: "1"
  });

  let quotationRows = await pgrest<QuotationRow[]>(
    `quotations?${quotParams.toString()}`,
    { method: "GET" }
  ).catch(() => [] as QuotationRow[]);

  const totalAmount = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const primaryCurrency = lineItems[0]?.currency ?? "MXN";

  // ─── Bloque de escritura ────────────────────────────────────────────────────
  try {
    let quotationId: string;

    if (!quotationRows[0]) {
      // Crear nueva cotización contenedor
      const newQuotRows = await pgrest<QuotationRow[]>("quotations", {
        method: "POST",
        body: JSON.stringify({
          tenant_id: tenantId,
          client_id: project.client_id,
          project_id: id,
          status: "draft"
        })
      });

      if (!newQuotRows[0]) {
        return NextResponse.json({ ok: false, error: "quotation_create_failed" }, { status: 500 });
      }

      quotationId = newQuotRows[0].id;
    } else {
      quotationId = quotationRows[0].id;
    }

    // Determinar el siguiente número de versión
    const versionsParams = new URLSearchParams({
      select: "id,version_number,admin_status",
      quotation_id: `eq.${quotationId}`,
      order: "version_number.desc"
    });

    const existingVersions = await pgrest<QuotationVersionRow[]>(
      `quotation_versions?${versionsParams.toString()}`,
      { method: "GET" }
    ).catch(() => [] as QuotationVersionRow[]);

    const nextVersionNumber =
      existingVersions.length > 0
        ? Math.max(...existingVersions.map((v) => v.version_number)) + 1
        : 1;

    // Construir markdown y resumen comercial
    const bodyMarkdown = buildQuotationMarkdown(
      title,
      summaryText,
      lineItems,
      validUntil,
      notes
    );

    const commercialSummaryJson = buildCommercialSummaryJson(
      totalAmount,
      primaryCurrency,
      summaryText,
      lineItems,
      notes
    );

    // Crear nueva versión
    const newVersionRows = await pgrest<QuotationVersionRow[]>("quotation_versions", {
      method: "POST",
      body: JSON.stringify({
        quotation_id: quotationId,
        tenant_id: tenantId,
        version_number: nextVersionNumber,
        title: title.trim(),
        body_markdown: bodyMarkdown.trim(),
        admin_status: "draft",
        commercial_summary_json: commercialSummaryJson,
        internal_note: notes?.trim() || null
      })
    });

    if (!newVersionRows[0]) {
      return NextResponse.json({ ok: false, error: "version_create_failed" }, { status: 500 });
    }

    const newVersion = newVersionRows[0];
    let finalStatus: "draft" | "vigente" = "draft";
    let emailSent = false;

    if (setAsActive) {
      // Activar la versión y marcar la cotización como enviada
      await pgrest(
        `quotations?id=eq.${encodeURIComponent(quotationId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            active_version_id: newVersion.id,
            status: "sent"
          })
        }
      ).catch(() => null);

      finalStatus = "vigente";
      // emailSent queda false — requiere datos de contacto del cliente (V2)
    }

    return NextResponse.json(
      {
        ok: true,
        quotationId,
        version: newVersion.version_number,
        status: finalStatus,
        totalAmount,
        currency: primaryCurrency,
        emailSent
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "quotation_write_failed" },
      { status: 500 }
    );
  }
}
