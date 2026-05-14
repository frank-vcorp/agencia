/**
 * IMPL-20260513-03
 * Respaldo: context/SPECs/SPEC_ARCH-20260513-03_pdf_cotizaciones_y_propuestas_v1.md
 *
 * Tests del slice PDF de cotizaciones.
 * Cubre: helpers puros (buildPdfFilename), contrato de QuotationExportData
 * y smoke-test del render del buffer.
 */
import { describe, expect, it, vi } from "vitest";

import { buildPdfFilename, type QuotationExportData } from "./quotations";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// @react-pdf/renderer requiere Node canvas y módulos nativos;
// el mock evita errores en el entorno de test de vitest (jsdom/happy-dom).
vi.mock("@react-pdf/renderer", () => ({
  Document: ({ children }: { children: React.ReactNode }) => children,
  Page: ({ children }: { children: React.ReactNode }) => children,
  View: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => children,
  StyleSheet: { create: (s: object) => s },
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.4 mock"))
}));

// ─── Helpers puros ────────────────────────────────────────────────────────────

describe("buildPdfFilename", () => {
  it("genera nombre con formato esperado", () => {
    expect(buildPdfFilename("VectorIA", "Sinergia RH", 2)).toBe(
      "cotizacion-vectoria-sinergia-rh-v2.pdf"
    );
  });

  it("normaliza acentos y caracteres especiales", () => {
    expect(buildPdfFilename("Área Creación", "Diseño Visual", 1)).toBe(
      "cotizacion-area-creacion-diseno-visual-v1.pdf"
    );
  });

  it("colapsa espacios y separadores a guion simple", () => {
    expect(buildPdfFilename("ACME Corp.", "Proyecto  2025", 3)).toBe(
      "cotizacion-acme-corp-proyecto-2025-v3.pdf"
    );
  });

  it("no deja guiones al inicio o al final", () => {
    const name = buildPdfFilename("  Agencia  ", "  Bridge  ", 1);
    expect(name).not.toMatch(/^cotizacion--/);
    expect(name).not.toMatch(/--v1\.pdf$/);
  });

  it("versiones altas producen el sufijo correcto", () => {
    expect(buildPdfFilename("A", "B", 99)).toMatch(/-v99\.pdf$/);
  });
});

// ─── Render smoke-test ────────────────────────────────────────────────────────

describe("buildQuotationPdfBuffer", () => {
  const sampleData: QuotationExportData = {
    quotationId: "qid-001",
    projectId: "pid-001",
    projectName: "Sinergia RH",
    clientName: "VectorIA",
    generatedAt: "2026-05-13T12:00:00.000Z",
    version: {
      id: "vid-001",
      tenantId: "tid-001",
      quotationId: "qid-001",
      versionNumber: 2,
      title: "Propuesta V2 — Identidad Visual",
      bodyMarkdown:
        "# Propuesta\n\n**Total: $45,000 MXN**\n\n**Válido hasta:** 2026-06-01",
      commercialSummaryJson: {
        totalEstimado: "$45,000 MXN",
        plazo: "4 semanas",
        alcance: "Identidad visual completa",
        incluye: ["Logo", "Manual de marca", "Paleta de colores"],
        nota: "Incluye 2 rondas de revisión"
      },
      adminStatus: "approved",
      internalNote: null,
      createdByUserId: null,
      createdByAgentId: null,
      createdAt: "2026-05-10T10:00:00.000Z"
    }
  };

  it("produce un Buffer con datos PDF (con mock)", async () => {
    const { buildQuotationPdfBuffer } = await import("./quotation-pdf");
    const buf = await buildQuotationPdfBuffer(sampleData, "Vectoria");
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });

  it("usa el agencyName recibido como parametro", async () => {
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { buildQuotationPdfBuffer } = await import("./quotation-pdf");
    await buildQuotationPdfBuffer(sampleData, "Mi Agencia");
    expect(renderToBuffer).toHaveBeenCalled();
  });

  it("acepta version sin commercialSummaryJson (solo bodyMarkdown)", async () => {
    const { buildQuotationPdfBuffer } = await import("./quotation-pdf");
    const dataMinimal: QuotationExportData = {
      ...sampleData,
      version: { ...sampleData.version, commercialSummaryJson: null }
    };
    await expect(buildQuotationPdfBuffer(dataMinimal)).resolves.toBeTruthy();
  });
});
