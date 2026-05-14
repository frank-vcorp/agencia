/**
 * IMPL-20260513-03
 * Respaldo: context/SPECs/SPEC_ARCH-20260513-03_pdf_cotizaciones_y_propuestas_v1.md
 *
 * GET /api/v1/projects/[id]/quotation/pdf
 * Genera y entrega el PDF de la cotización vigente del proyecto indicado.
 * No requiere Bearer auth: lectura pública para la UI interna del operador
 * (coherente con el resto de páginas de Bridge que tampoco tienen auth de sesión).
 */
import { NextRequest, NextResponse } from "next/server";

import { getTenantSlug } from "@/lib/agent-auth";
import { buildQuotationPdfBuffer } from "@/lib/quotation-pdf";
import {
  buildPdfFilename,
  getActiveQuotationExportData
} from "@/lib/quotations";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: projectId } = await params;

  if (!projectId) {
    return NextResponse.json({ ok: false, error: "project_id_required" }, { status: 400 });
  }

  const tenantSlug = getTenantSlug(req);

  let exportData;
  try {
    exportData = await getActiveQuotationExportData(projectId, tenantSlug);
  } catch {
    return NextResponse.json(
      { ok: false, error: "quotation_fetch_failed" },
      { status: 500 }
    );
  }

  if (!exportData) {
    return NextResponse.json(
      { ok: false, error: "no_active_quotation", message: "Este proyecto no tiene cotizacion vigente exportable." },
      { status: 404 }
    );
  }

  let pdfBuffer: Buffer;
  try {
    const agencyName = process.env.BRIDGE_AGENCY_NAME ?? "Vectoria";
    pdfBuffer = await buildQuotationPdfBuffer(exportData, agencyName);
  } catch {
    return NextResponse.json(
      { ok: false, error: "pdf_render_failed" },
      { status: 500 }
    );
  }

  const filename = buildPdfFilename(
    exportData.clientName,
    exportData.projectName,
    exportData.version.versionNumber
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.byteLength)
    }
  });
}
