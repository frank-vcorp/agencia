/**
 * IMPL-20260505-23
 * Respaldo: context/COTIZACIONES_VERSIONADAS_V1.md, context/SPECs/SPEC_ARCH-20260505-23_cotizaciones_versionadas_v1.md
 */
import { describe, expect, it } from "vitest";

import {
  nextVersionNumber,
  quotationStatusLabel,
  versionAdminStatusLabel,
  type QuotationVersion
} from "./quotations";

describe("quotations", () => {
  it("mapea etiquetas de estado de cotizacion", () => {
    expect(quotationStatusLabel("draft")).toBe("Borrador");
    expect(quotationStatusLabel("sent")).toBe("Enviada");
    expect(quotationStatusLabel("approved")).toBe("Aprobada");
    expect(quotationStatusLabel("invoiced")).toBe("Facturada");
    expect(quotationStatusLabel("paid")).toBe("Pagada");
  });

  it("mapea etiquetas de estado administrativo de version", () => {
    expect(versionAdminStatusLabel("draft")).toBe("Borrador");
    expect(versionAdminStatusLabel("in_review")).toBe("En revision");
    expect(versionAdminStatusLabel("approved")).toBe("Aprobada");
    expect(versionAdminStatusLabel("rejected")).toBe("Rechazada");
    expect(versionAdminStatusLabel("superseded")).toBe("Reemplazada");
  });

  it("calcula el siguiente numero de version sobre lista vacia", () => {
    expect(nextVersionNumber([])).toBe(1);
  });

  it("calcula el siguiente numero de version sobre lista existente", () => {
    const versions: Pick<QuotationVersion, "versionNumber">[] = [
      { versionNumber: 1 },
      { versionNumber: 2 },
      { versionNumber: 3 }
    ];

    expect(nextVersionNumber(versions as QuotationVersion[])).toBe(4);
  });

  it("calcula el siguiente numero de version con gaps en la numeracion", () => {
    const versions: Pick<QuotationVersion, "versionNumber">[] = [
      { versionNumber: 1 },
      { versionNumber: 5 }
    ];

    expect(nextVersionNumber(versions as QuotationVersion[])).toBe(6);
  });
});
