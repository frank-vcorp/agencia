/**
 * IMPL-20260505-24
 * Respaldo: context/ACTIVOS_OPERABLES_V1.md, context/CATALOGO_ACTIVOS_V1.md,
 *           context/SPECs/SPEC_ARCH-20260505-24_activos_vinculados_a_cotizacion_y_project_v1.md
 */
import { describe, expect, it, beforeEach, afterEach, vi, type MockInstance } from "vitest";

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

// ─── createOrUpdateAssetPrompt ─────────────────────────────────────────────────

import { createOrUpdateAssetPrompt } from "./assets";

describe("createOrUpdateAssetPrompt", () => {
  let fetchMock: MockInstance;

  beforeEach(() => {
    // @ts-expect-error - reemplazar fetch global en tests
    fetchMock = vi.spyOn(globalThis, "fetch");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fake.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fake-anon-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  function makeJsonResponse(data: unknown, status = 200) {
    return Promise.resolve(
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
      })
    );
  }

  it("lanza asset_not_found si el asset no pertenece al tenant", async () => {
    fetchMock.mockReturnValueOnce(makeJsonResponse([])); // assets query → vacío
    await expect(
      createOrUpdateAssetPrompt("bad-id", "tenant-1", "spec")
    ).rejects.toThrow("asset_not_found");
  });

  it("crea version 1 cuando no existen versiones previas", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: "asset-1" }])) // assets check
      .mockReturnValueOnce(makeJsonResponse([]))                   // versiones existentes
      .mockReturnValueOnce(                                        // POST nueva versión
        makeJsonResponse([{
          id: "ver-1",
          tenant_id: "tenant-1",
          asset_id: "asset-1",
          version_number: 1,
          prompt_text: "spec",
          references_json: null,
          status: "active",
          created_by_user_id: null,
          created_by_agent_id: "vscode-agent",
          created_at: "2026-05-10T00:00:00Z"
        }])
      );

    const result = await createOrUpdateAssetPrompt("asset-1", "tenant-1", "spec");
    expect(result.versionNumber).toBe(1);
    expect(result.status).toBe("active");
    expect(result.createdByAgentId).toBe("vscode-agent");
  });

  it("supersede version activa anterior y crea version 2", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: "asset-1" }]))   // assets check
      .mockReturnValueOnce(makeJsonResponse([                        // versiones existentes
        { id: "ver-1", version_number: 1, status: "active" }
      ]))
      .mockReturnValueOnce(makeJsonResponse([{ id: "ver-1" }]))     // PATCH superseded
      .mockReturnValueOnce(                                          // POST nueva versión
        makeJsonResponse([{
          id: "ver-2",
          tenant_id: "tenant-1",
          asset_id: "asset-1",
          version_number: 2,
          prompt_text: "spec v2",
          references_json: null,
          status: "active",
          created_by_user_id: null,
          created_by_agent_id: "vscode-agent",
          created_at: "2026-05-10T01:00:00Z"
        }])
      );

    const result = await createOrUpdateAssetPrompt("asset-1", "tenant-1", "spec v2");
    expect(result.versionNumber).toBe(2);
    expect(result.status).toBe("active");

    // Verificar que el PATCH de superseded fue llamado
    const patchCall = fetchMock.mock.calls.find(([url]) =>
      typeof url === "string" && url.includes("id=eq.ver-1")
    );
    expect(patchCall).toBeDefined();
  });
});
