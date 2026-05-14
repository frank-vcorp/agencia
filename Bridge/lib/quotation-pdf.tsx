/**
 * IMPL-20260513-03
 * Respaldo: context/SPECs/SPEC_ARCH-20260513-03_pdf_cotizaciones_y_propuestas_v1.md
 *
 * Plantilla PDF comercial para cotizaciones vigentes.
 * Usa @react-pdf/renderer en servidor Node.js (no browser, no headless).
 */
import React from "react";

import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

import type { QuotationExportData } from "./quotations";

// ─── Estilos ──────────────────────────────────────────────────────────────────

const ACCENT = "#c85d27";
const ACCENT_DEEP = "#7d3414";
const MUTED = "#6b7280";
const LINE = "#e5e1da";
const BG_LIGHT = "#faf9f7";
const TEXT = "#1a1a1a";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 52,
    fontSize: 10,
    color: TEXT
  },
  // Cabecera
  header: {
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
    paddingBottom: 14,
    marginBottom: 20
  },
  agencyLabel: {
    fontSize: 8,
    letterSpacing: 2,
    color: MUTED,
    textTransform: "uppercase"
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: ACCENT_DEEP,
    marginTop: 4
  },
  // Metadatos del documento
  metaGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20
  },
  metaCell: {
    flex: 1,
    backgroundColor: BG_LIGHT,
    borderRadius: 6,
    padding: 10
  },
  metaLabel: {
    fontSize: 7,
    letterSpacing: 1.5,
    color: MUTED,
    textTransform: "uppercase",
    marginBottom: 3
  },
  metaValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: TEXT
  },
  // Resumen comercial
  sectionTitle: {
    fontSize: 7,
    letterSpacing: 1.5,
    color: MUTED,
    textTransform: "uppercase",
    marginBottom: 8
  },
  totalBox: {
    backgroundColor: "#fff3ec",
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: ACCENT
  },
  totalLabel: {
    fontSize: 7,
    letterSpacing: 1.5,
    color: ACCENT,
    textTransform: "uppercase",
    marginBottom: 4
  },
  totalValue: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: ACCENT_DEEP
  },
  infoGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12
  },
  infoCell: {
    flex: 1,
    backgroundColor: BG_LIGHT,
    borderRadius: 6,
    padding: 10
  },
  // Lista incluye
  includesContainer: {
    backgroundColor: BG_LIGHT,
    borderRadius: 6,
    padding: 12,
    marginBottom: 12
  },
  includeItem: {
    fontSize: 10,
    marginBottom: 4,
    color: TEXT
  },
  // Propuesta completa
  bodySection: {
    marginBottom: 12
  },
  bodyText: {
    fontSize: 9,
    lineHeight: 1.6,
    color: TEXT,
    backgroundColor: BG_LIGHT,
    borderRadius: 6,
    padding: 12
  },
  // Notas
  notesBox: {
    backgroundColor: BG_LIGHT,
    borderRadius: 6,
    padding: 10,
    marginBottom: 12
  },
  notesText: {
    fontSize: 9,
    lineHeight: 1.5,
    color: MUTED
  },
  // Divisor
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    marginVertical: 12
  },
  // Pie de página
  footer: {
    position: "absolute",
    bottom: 32,
    left: 52,
    right: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 8
  },
  footerText: {
    fontSize: 8,
    color: MUTED
  }
});

// ─── Componente de plantilla ──────────────────────────────────────────────────

interface QuotationPdfDocumentProps {
  data: QuotationExportData;
  agencyName: string;
}

function QuotationPdfDocument({ data, agencyName }: QuotationPdfDocumentProps) {
  const { version, projectName, clientName, generatedAt } = data;
  const summary = version.commercialSummaryJson;

  const generatedDate = new Date(generatedAt).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabecera */}
        <View style={styles.header}>
          <Text style={styles.agencyLabel}>{agencyName} · Propuesta Comercial</Text>
          <Text style={styles.headerTitle}>{version.title}</Text>
        </View>

        {/* Metadatos */}
        <View style={styles.metaGrid}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Cliente</Text>
            <Text style={styles.metaValue}>{clientName}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Proyecto</Text>
            <Text style={styles.metaValue}>{projectName}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Version</Text>
            <Text style={styles.metaValue}>V{version.versionNumber}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Fecha</Text>
            <Text style={styles.metaValue}>{generatedDate}</Text>
          </View>
        </View>

        {/* Resumen comercial estructurado */}
        {summary ? (
          <>
            <Text style={styles.sectionTitle}>Resumen Comercial</Text>

            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total Estimado</Text>
              <Text style={styles.totalValue}>{summary.totalEstimado}</Text>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoCell}>
                <Text style={styles.metaLabel}>Plazo</Text>
                <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold" }}>{summary.plazo}</Text>
              </View>
              <View style={[styles.infoCell, { flex: 2 }]}>
                <Text style={styles.metaLabel}>Alcance</Text>
                <Text style={{ fontSize: 10 }}>{summary.alcance}</Text>
              </View>
            </View>

            {summary.incluye?.length > 0 ? (
              <View style={styles.includesContainer}>
                <Text style={styles.sectionTitle}>Incluye</Text>
                {summary.incluye.map((item, idx) => (
                  <Text key={idx} style={styles.includeItem}>
                    {"• "}
                    {item}
                  </Text>
                ))}
              </View>
            ) : null}

            {summary.nota && summary.nota !== "Sin notas adicionales" ? (
              <View style={styles.notesBox}>
                <Text style={styles.sectionTitle}>Notas</Text>
                <Text style={styles.notesText}>{summary.nota}</Text>
              </View>
            ) : null}

            <View style={styles.divider} />
          </>
        ) : null}

        {/* Propuesta completa (markdown como texto plano) */}
        <View style={styles.bodySection}>
          <Text style={styles.sectionTitle}>Detalle de la propuesta</Text>
          <Text style={styles.bodyText}>{version.bodyMarkdown}</Text>
        </View>

        {/* Nota interna (si existe y es diferente al markdown) */}
        {version.internalNote && !summary?.nota?.includes(version.internalNote) ? (
          <View style={styles.notesBox}>
            <Text style={styles.sectionTitle}>Notas internas</Text>
            <Text style={styles.notesText}>{version.internalNote}</Text>
          </View>
        ) : null}

        {/* Pie de página */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{agencyName} · Documento generado por Bridge</Text>
          <Text style={styles.footerText}>Generado el {generatedDate}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── Función pública de render ────────────────────────────────────────────────

/**
 * Genera el buffer PDF de la cotización vigente.
 * Debe ejecutarse en entorno Node.js (API route, no edge runtime).
 */
export async function buildQuotationPdfBuffer(
  data: QuotationExportData,
  agencyName = "Vectoria"
): Promise<Buffer> {
  return renderToBuffer(<QuotationPdfDocument data={data} agencyName={agencyName} />);
}
