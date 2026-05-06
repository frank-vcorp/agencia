/**
 * IMPL-20260505-24
 * Respaldo: context/ACTIVOS_OPERABLES_V1.md, context/CATALOGO_ACTIVOS_V1.md,
 *           context/SPECs/SPEC_ARCH-20260505-24_activos_vinculados_a_cotizacion_y_project_v1.md
 */
import { describe, expect, it } from "vitest";

import {
  APPLICATION_CODES,
  FORMAT_CODES,
  PIECE_TYPE_CODES,
  PLACEMENT_CODES,
  applicationLabel,
  applicationLabels,
  assetStatusLabel,
  assetStatusLabels,
  formatLabel,
  formatLabels,
  nextPromptVersionNumber,
  pieceTypeLabel,
  pieceTypeLabels,
  placementLabel,
  placementLabels,
  type AssetPromptVersion,
  type AssetStatus
} from "./assets";

describe("assets — catalogos", () => {
  it("tiene 9 codigos de aplicativo", () => {
    expect(APPLICATION_CODES.length).toBe(9);
  });

  it("tiene 10 codigos de tipo de pieza", () => {
    expect(PIECE_TYPE_CODES.length).toBe(10);
  });

  it("tiene 13 codigos de placement", () => {
    expect(PLACEMENT_CODES.length).toBe(13);
  });

  it("tiene 7 codigos de formato", () => {
    expect(FORMAT_CODES.length).toBe(7);
  });

  it("cada codigo de aplicativo tiene etiqueta definida", () => {
    APPLICATION_CODES.forEach((code) => {
      expect(applicationLabels[code]).toBeTruthy();
    });
  });

  it("cada codigo de pieza tiene etiqueta definida", () => {
    PIECE_TYPE_CODES.forEach((code) => {
      expect(pieceTypeLabels[code]).toBeTruthy();
    });
  });

  it("cada codigo de placement tiene etiqueta definida", () => {
    PLACEMENT_CODES.forEach((code) => {
      expect(placementLabels[code]).toBeTruthy();
    });
  });

  it("cada codigo de formato tiene etiqueta definida", () => {
    FORMAT_CODES.forEach((code) => {
      expect(formatLabels[code]).toBeTruthy();
    });
  });
});

describe("assets — etiquetas de estado", () => {
  const casos: Array<[AssetStatus, string]> = [
    ["draft", "Borrador"],
    ["in_progress", "En progreso"],
    ["in_review", "En revision"],
    ["approved", "Aprobado"],
    ["delivered", "Entregado"],
    ["archived", "Archivado"]
  ];

  it.each(casos)("mapea estado '%s' a '%s'", (status, expected) => {
    expect(assetStatusLabel(status)).toBe(expected);
    expect(assetStatusLabels[status]).toBe(expected);
  });
});

describe("assets — helpers de etiqueta de catalogo", () => {
  it("applicationLabel devuelve etiqueta para codigo conocido", () => {
    expect(applicationLabel("instagram")).toBe("Instagram");
    expect(applicationLabel("whatsapp")).toBe("WhatsApp");
  });

  it("applicationLabel devuelve el codigo si es desconocido", () => {
    expect(applicationLabel("desconocido")).toBe("desconocido");
  });

  it("pieceTypeLabel devuelve etiqueta para codigo conocido", () => {
    expect(pieceTypeLabel("imagen")).toBe("Imagen");
    expect(pieceTypeLabel("reel")).toBe("Reel");
  });

  it("placementLabel devuelve etiqueta para codigo conocido", () => {
    expect(placementLabel("feed")).toBe("Feed");
    expect(placementLabel("story")).toBe("Story");
  });

  it("formatLabel devuelve etiqueta para codigo conocido", () => {
    expect(formatLabel("cuadrado_1_1")).toBe("Cuadrado 1:1");
    expect(formatLabel("vertical_9_16")).toBe("Vertical 9:16");
  });
});

describe("assets — nextPromptVersionNumber", () => {
  it("devuelve 1 para lista vacia", () => {
    expect(nextPromptVersionNumber([])).toBe(1);
  });

  it("devuelve siguiente numero sobre lista existente", () => {
    const versions: Pick<AssetPromptVersion, "versionNumber">[] = [
      { versionNumber: 1 },
      { versionNumber: 2 }
    ];
    expect(nextPromptVersionNumber(versions as AssetPromptVersion[])).toBe(3);
  });

  it("maneja gaps en numeracion", () => {
    const versions: Pick<AssetPromptVersion, "versionNumber">[] = [
      { versionNumber: 1 },
      { versionNumber: 4 }
    ];
    expect(nextPromptVersionNumber(versions as AssetPromptVersion[])).toBe(5);
  });
});
