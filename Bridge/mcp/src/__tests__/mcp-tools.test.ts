/**
 * IMPL-20260527-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260527-02_timeout_fail_fast_mcp_bridge.md
 *
 * Tests del MCP server: bridge_list_assets, bridge_write_production_spec,
 * bridge_get_brief, bridge_write_quotation y saveLocalCopy.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BridgeClient } from "../bridge-client.js";
import { handleListAssets } from "../tools/list-assets.js";
import { handleGetAssetContext } from "../tools/get-asset-context.js";
import { handleWriteProductionSpec } from "../tools/write-production-spec.js";
import { handleGetBrief } from "../tools/get-brief.js";
import { handleWriteQuotation } from "../tools/write-quotation.js";
import { handleDownloadAssetFiles } from "../tools/download-asset-files.js";
import { saveLocalCopy } from "../utils/local-copy.js";

// Mock del módulo fs para todos los tests que usan saveLocalCopy
vi.mock("fs", () => ({
  existsSync: vi.fn(() => false),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn()
}));

const CONFIG = {
  bridgeUrl: "http://localhost:3000",
  bridgeMcpSecret: "a".repeat(32),
  bridgeTenantSlug: "vectoria",
  workspaceRoot: "/workspace"
};

describe("bridge_list_assets", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function makeResponse(data: unknown, status = 200) {
    return Promise.resolve(
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
      })
    );
  }

  it("retorna lista formateada cuando hay activos", async () => {
    fetchMock.mockReturnValueOnce(
      makeResponse({
        ok: true,
        assets: [
          {
            id: "asset-1",
            title: "Post Instagram",
            applicationCode: "instagram",
            pieceTypeCode: "imagen",
            status: "draft",
            hasActiveSpec: false,
            projectId: "proj-1",
            clientId: "client-1"
          }
        ],
        total: 1
      })
    );

    const client = new BridgeClient(CONFIG);
    const result = await handleListAssets(client);

    expect(result).toContain("Post Instagram");
    expect(result).toContain("instagram");
    expect(result).toContain("Total de activos: 1");
    expect(result).toContain("Spec activa: No");
  });

  it("retorna mensaje apropiado cuando no hay activos", async () => {
    fetchMock.mockReturnValueOnce(makeResponse({ ok: true, assets: [], total: 0 }));

    const client = new BridgeClient(CONFIG);
    const result = await handleListAssets(client);

    expect(result).toContain("No hay activos");
  });

  it("retorna error descriptivo si la API falla", async () => {
    fetchMock.mockReturnValueOnce(makeResponse({ ok: false, error: "unauthorized" }, 401));

    const client = new BridgeClient(CONFIG);
    const result = await handleListAssets(client);

    expect(result).toContain("Error");
    expect(result).toContain("401");
  });

  it("retorna error operativo si Bridge excede el timeout", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementationOnce((_url: string, init?: RequestInit) => {
      const signal = init?.signal as AbortSignal;

      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener(
          "abort",
          () => {
            const abortError = new Error("The operation was aborted.");
            abortError.name = "AbortError";
            reject(abortError);
          },
          { once: true }
        );
      });
    });

    const client = new BridgeClient(CONFIG);
    const resultPromise = handleListAssets(client);

    await vi.advanceTimersByTimeAsync(10_000);

    await expect(resultPromise).resolves.toContain(
      "Error al obtener activos: bridge_timeout_error:Bridge no respondio en 10000ms"
    );
  });
});

describe("bridge_write_production_spec", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeResponse(data: unknown, status = 200) {
    return Promise.resolve(
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
      })
    );
  }

  it("retorna confirmacion con version cuando tiene exito", async () => {
    fetchMock.mockReturnValueOnce(
      makeResponse({
        ok: true,
        promptVersionId: "ver-2",
        versionNumber: 2,
        assetId: "asset-1",
        message: "Especificación publicada. El diseñador la verá en su workspace de Bridge."
      })
    );

    const client = new BridgeClient(CONFIG);
    const result = await handleWriteProductionSpec(client, {
      assetId: "asset-1",
      specContent: "# Mi spec"
    }, "");

    expect(result).toContain("Especificación publicada");
    expect(result).toContain("Version: 2");
  });

  it("retorna error descriptivo cuando asset no existe", async () => {
    fetchMock.mockReturnValueOnce(
      makeResponse({ ok: false, error: "asset_not_found" }, 404)
    );

    const client = new BridgeClient(CONFIG);
    const result = await handleWriteProductionSpec(client, {
      assetId: "bad-id",
      specContent: "# Spec"
    }, "");

    expect(result).toContain("no existe");
  });

  it("valida que assetId sea requerido", async () => {
    const client = new BridgeClient(CONFIG);
    const result = await handleWriteProductionSpec(client, { specContent: "# Spec" }, "");
    expect(result).toContain("Error");
    expect(result).toContain("assetId");
  });

  it("valida que specContent sea requerido y no vacio", async () => {
    const client = new BridgeClient(CONFIG);
    const result = await handleWriteProductionSpec(client, {
      assetId: "asset-1",
      specContent: "   "
    }, "");
    expect(result).toContain("Error");
    expect(result).toContain("specContent");
  });

  it("envia el payload correcto a la API", async () => {
    fetchMock.mockReturnValueOnce(
      makeResponse({
        ok: true,
        promptVersionId: "ver-1",
        versionNumber: 1,
        assetId: "asset-1",
        message: "Especificación publicada."
      })
    );

    const client = new BridgeClient(CONFIG);
    await handleWriteProductionSpec(client, {
      assetId: "asset-1",
      specContent: "# Spec de producción",
      versionNote: "Primera versión"
    }, "");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/v1/assets/asset-1/prompts");
    expect(init.method).toBe("POST");

    const body = JSON.parse(init.body as string);
    expect(body.specContent).toBe("# Spec de producción");
    expect(body.versionNote).toBe("Primera versión");
    expect(init.headers as Record<string, string>).toMatchObject({
      Authorization: `Bearer ${"a".repeat(32)}`,
      "X-Bridge-Tenant": "vectoria"
    });
  });
});

describe("bridge_get_asset_context", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeResponse(data: unknown, status = 200) {
    return Promise.resolve(
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
      })
    );
  }

  it("retorna contexto formateado con spec y brief", async () => {
    fetchMock.mockReturnValueOnce(
      makeResponse({
        ok: true,
        asset: {
          id: "asset-1",
          title: "Post Lanzamiento",
          applicationCode: "instagram",
          pieceTypeCode: "imagen",
          placementCode: "feed",
          formatCode: "cuadrado_1_1",
          status: "draft"
        },
        activeSpec: {
          versionNumber: 1,
          promptText: "# Spec existente",
          createdAt: "2026-05-10T00:00:00Z"
        },
        briefSummary: "Cliente quiere imagen de lanzamiento.",
        readyForSpec: true
      })
    );

    const client = new BridgeClient(CONFIG);
    const result = await handleGetAssetContext(client, { assetId: "asset-1" });

    expect(result).toContain("Post Lanzamiento");
    expect(result).toContain("Spec Activa (v1)");
    expect(result).toContain("Cliente quiere imagen");
    expect(result).toContain("# Spec existente");
  });

  it("maneja el caso de asset inexistente", async () => {
    fetchMock.mockReturnValueOnce(new Response(null, { status: 404 }));

    const client = new BridgeClient(CONFIG);
    const result = await handleGetAssetContext(client, { assetId: "bad-id" });

    expect(result).toContain("no existe");
  });

  it("valida que assetId sea requerido", async () => {
    const client = new BridgeClient(CONFIG);
    const result = await handleGetAssetContext(client, {});
    expect(result).toContain("Error");
    expect(result).toContain("assetId");
  });
});

// ─── saveLocalCopy ─────────────────────────────────────────────────────────────

describe("saveLocalCopy", () => {
  it("crea el directorio y escribe el archivo cuando no existe", async () => {
    const { existsSync, mkdirSync, writeFileSync } = await import("fs");
    vi.mocked(existsSync).mockReturnValue(false);

    const result = saveLocalCopy("brief", "techcorp", "# Contenido", "/workspace");

    expect(mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining("techcorp"),
      { recursive: true }
    );
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("brief.md"),
      expect.stringContaining("# Contenido"),
      "utf-8"
    );
    expect(result).toContain("brief.md");
    expect(result).toContain("techcorp");
  });

  it("no llama a mkdirSync si el directorio ya existe", async () => {
    const { existsSync, mkdirSync } = await import("fs");
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(mkdirSync).mockClear();

    saveLocalCopy("propuesta", "cliente-abc", "contenido", "/workspace");

    expect(mkdirSync).not.toHaveBeenCalled();
  });

  it("el archivo incluye el header de copia local", async () => {
    const { existsSync, writeFileSync } = await import("fs");
    vi.mocked(existsSync).mockReturnValue(true);

    saveLocalCopy("prompts-produccion", "mi-cliente", "# Spec", "/workspace");

    const [[, content]] = (vi.mocked(writeFileSync) as ReturnType<typeof vi.fn>).mock.calls
      .filter(([path]: [string]) => String(path).includes("prompts-produccion"));
    expect(content).toContain("Copia local generada por Bridge MCP");
    expect(content).toContain("Fuente de verdad: Bridge/Supabase");
    expect(content).toContain("# Spec");
  });

  it("guarda brief en briefing/brief.md cuando layout=project-folders", async () => {
    const { existsSync, writeFileSync } = await import("fs");
    vi.mocked(existsSync).mockReturnValue(true);

    const result = saveLocalCopy("brief", "techcorp", "# Brief", "/workspace", {
      layout: "project-folders",
      localProjectPath: "clientes/techcorp/proyecto-lanzamiento"
    });

    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("clientes/techcorp/proyecto-lanzamiento/briefing/brief.md"),
      expect.stringContaining("# Brief"),
      "utf-8"
    );
    expect(result).toContain("briefing/brief.md");
  });

  it("rechaza localProjectPath fuera de workspaceRoot en project-folders", () => {
    expect(() =>
      saveLocalCopy("brief", "techcorp", "# Brief", "/workspace", {
        layout: "project-folders",
        localProjectPath: "../../etc"
      })
    ).toThrow("localProjectPath debe permanecer dentro de workspaceRoot");
  });
});

// ─── bridge_get_brief ─────────────────────────────────────────────────────────

describe("bridge_get_brief", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    // Asegurar que fs no intente escribir realmente
    const fs = vi.getMockImplementation ? vi : { mock: {} };
    void fs;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeResponse(data: unknown, status = 200) {
    return Promise.resolve(
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
      })
    );
  }

  it("retorna brief estructurado y guarda copia local", async () => {
    fetchMock.mockReturnValueOnce(
      makeResponse({
        ok: true,
        project: { id: "proj-1", name: "Campaña Mayo 2026" },
        brief: {
          status: "completed",
          summary: "Software contable para PyMEs",
          objectives: ["Aumentar ventas", "Generar awareness"],
          targetAudience: "PyMEs en LATAM",
          tone: "Profesional",
          references: ["ejemplo.com"],
          constraints: ["No usar rojo"],
          rawContent: "# Brief completo..."
        }
      })
    );

    const client = new BridgeClient(CONFIG);
    const result = await handleGetBrief(client, {
      projectId: "proj-1",
      clientSlug: "techcorp"
    }, "/workspace");

    expect(result).toContain("✓ Brief leído correctamente");
    expect(result).toContain("Campaña Mayo 2026");
    expect(result).toContain("Copia guardada en");
  });

  it("guarda brief en project-folders cuando se solicita el layout nuevo", async () => {
    fetchMock.mockReturnValueOnce(
      makeResponse({
        ok: true,
        project: { id: "proj-1", name: "Campaña Mayo 2026" },
        brief: {
          status: "completed",
          summary: "Software contable para PyMEs",
          objectives: ["Aumentar ventas"],
          targetAudience: "PyMEs en LATAM",
          tone: "Profesional",
          references: [],
          constraints: [],
          rawContent: "# Brief completo..."
        }
      })
    );

    const client = new BridgeClient(CONFIG);
    const result = await handleGetBrief(client, {
      projectId: "proj-1",
      clientSlug: "techcorp",
      localLayout: "project-folders",
      localProjectPath: "clientes/techcorp/proyecto-lanzamiento"
    }, "/workspace");

    expect(result).toContain("briefing/brief.md");
  });

  it("retorna error cuando el proyecto no existe", async () => {
    fetchMock.mockReturnValueOnce(new Response(null, { status: 404 }));

    const client = new BridgeClient(CONFIG);
    const result = await handleGetBrief(client, {
      projectId: "bad-id",
      clientSlug: "techcorp"
    }, "/workspace");

    expect(result).toContain("Error");
    expect(result).toContain("bad-id");
  });

  it("valida que projectId sea requerido", async () => {
    const client = new BridgeClient(CONFIG);
    const result = await handleGetBrief(client, { clientSlug: "techcorp" }, "/workspace");
    expect(result).toContain("Error");
    expect(result).toContain("projectId");
  });

  it("valida que clientSlug sea requerido", async () => {
    const client = new BridgeClient(CONFIG);
    const result = await handleGetBrief(client, { projectId: "proj-1" }, "/workspace");
    expect(result).toContain("Error");
    expect(result).toContain("clientSlug");
  });

  it("valida que localProjectPath exista cuando localLayout=project-folders", async () => {
    const client = new BridgeClient(CONFIG);
    const result = await handleGetBrief(client, {
      projectId: "proj-1",
      clientSlug: "techcorp",
      localLayout: "project-folders"
    }, "/workspace");
    expect(result).toContain("Error");
    expect(result).toContain("localProjectPath");
  });
});

// ─── bridge_write_quotation ───────────────────────────────────────────────────

describe("bridge_write_quotation", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeResponse(data: unknown, status = 200) {
    return Promise.resolve(
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
      })
    );
  }

  const LINE_ITEMS = [
    { description: "Banner Facebook", quantity: 2, unitPrice: 3500, currency: "MXN" as const }
  ];

  it("crea cotización exitosamente y guarda copia local", async () => {
    fetchMock.mockReturnValueOnce(
      makeResponse({
        ok: true,
        quotationId: "quot-1",
        version: 1,
        status: "vigente",
        totalAmount: 7000,
        currency: "MXN",
        emailSent: false
      }, 201)
    );

    const client = new BridgeClient(CONFIG);
    const result = await handleWriteQuotation(client, {
      projectId: "proj-1",
      clientSlug: "techcorp",
      title: "Propuesta Mayo 2026",
      summaryText: "Propuesta de diseño",
      lineItems: LINE_ITEMS,
      validUntil: "2026-06-10",
      setAsActive: true
    }, "/workspace");

    expect(result).toContain("✓ Cotización #1 creada exitosamente");
    expect(result).toContain("vigente");
    expect(result).toContain("$7,000");
    expect(result).toContain("Copia guardada en");
  });

  it("retorna error de la API cuando falla", async () => {
    fetchMock.mockReturnValueOnce(
      makeResponse({ ok: false, error: "project_not_found" })
    );

    const client = new BridgeClient(CONFIG);
    const result = await handleWriteQuotation(client, {
      projectId: "bad-id",
      clientSlug: "techcorp",
      title: "Propuesta",
      summaryText: "Resumen",
      lineItems: LINE_ITEMS,
      validUntil: "2026-06-10"
    }, "/workspace");

    expect(result).toContain("Error");
  });

  it("valida que lineItems no sea vacío", async () => {
    const client = new BridgeClient(CONFIG);
    const result = await handleWriteQuotation(client, {
      projectId: "proj-1",
      clientSlug: "techcorp",
      title: "Propuesta",
      summaryText: "Resumen",
      lineItems: [],
      validUntil: "2026-06-10"
    }, "/workspace");

    expect(result).toContain("Error");
    expect(result).toContain("lineItems");
  });

  it("valida campos requeridos faltantes", async () => {
    const client = new BridgeClient(CONFIG);
    const result = await handleWriteQuotation(client, {
      clientSlug: "techcorp",
      lineItems: LINE_ITEMS
    }, "/workspace");

    expect(result).toContain("Error");
  });
});

describe("bridge_download_asset_files", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeResponse(data: unknown, status = 200) {
    return Promise.resolve(
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" }
      })
    );
  }

  it("descarga archivos del activo al workspace", async () => {
    fetchMock
      .mockReturnValueOnce(
        makeResponse({
          ok: true,
          asset: { id: "asset-1", title: "Reel Captación" },
          files: [
            {
              evidenceId: "ev-1",
              proposalId: "prop-1",
              fileName: "toma-fachada.mp4",
              mimeType: "video/mp4",
              storagePath: "tenant/asset/file.mp4",
              signedUrl: "https://signed.example.com/file.mp4",
              uploadedAt: "2026-05-13T00:00:00Z"
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        new Response(Uint8Array.from([1, 2, 3]), { status: 200 })
      );

    const client = new BridgeClient(CONFIG);
    const result = await handleDownloadAssetFiles(client, {
      assetId: "asset-1",
      assetSlug: "reel-captacion",
      localLayout: "project-folders",
      localProjectPath: "clientes/techcorp/proyecto-lanzamiento"
    }, "/workspace");

    const { writeFileSync } = await import("fs");
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("clientes/techcorp/proyecto-lanzamiento/activos/reel-captacion/ev-1__toma-fachada.mp4"),
      expect.any(Buffer)
    );
    expect(result).toContain("Descargados: 1");
  });

  it("retorna mensaje honesto cuando no hay archivos", async () => {
    fetchMock.mockReturnValueOnce(
      makeResponse({
        ok: true,
        asset: { id: "asset-1", title: "Reel Captación" },
        files: []
      })
    );

    const client = new BridgeClient(CONFIG);
    const result = await handleDownloadAssetFiles(client, {
      assetId: "asset-1",
      assetSlug: "reel-captacion"
    }, "/workspace");

    expect(result).toContain("No hay archivos reales descargables");
  });

  it("valida localProjectPath cuando localLayout=project-folders", async () => {
    const client = new BridgeClient(CONFIG);
    const result = await handleDownloadAssetFiles(client, {
      assetId: "asset-1",
      assetSlug: "reel-captacion",
      localLayout: "project-folders"
    }, "/workspace");

    expect(result).toContain("localProjectPath");
  });

  it("rechaza localProjectPath fuera de workspaceRoot", async () => {
    const client = new BridgeClient(CONFIG);
    const result = await handleDownloadAssetFiles(client, {
      assetId: "asset-1",
      assetSlug: "reel-captacion",
      localLayout: "project-folders",
      localProjectPath: "../../etc"
    }, "/workspace");

    expect(result).toContain("workspaceRoot");
  });

  it("sanitiza fileName para evitar traversal", async () => {
    fetchMock
      .mockReturnValueOnce(
        makeResponse({
          ok: true,
          asset: { id: "asset-1", title: "Reel Captación" },
          files: [
            {
              evidenceId: "ev-1",
              proposalId: "prop-1",
              fileName: "../../malicioso.mp4",
              mimeType: "video/mp4",
              storagePath: "tenant/asset/file.mp4",
              signedUrl: "https://signed.example.com/file.mp4",
              uploadedAt: "2026-05-13T00:00:00Z"
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        new Response(Uint8Array.from([1, 2, 3]), { status: 200 })
      );

    const client = new BridgeClient(CONFIG);
    await handleDownloadAssetFiles(client, {
      assetId: "asset-1",
      assetSlug: "reel-captacion",
      localLayout: "project-folders",
      localProjectPath: "clientes/techcorp/proyecto-lanzamiento"
    }, "/workspace");

    const { writeFileSync } = await import("fs");
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("reel-captacion/ev-1__malicioso.mp4"),
      expect.any(Buffer)
    );
  });

  it("sanitiza assetSlug para evitar traversal", async () => {
    const { writeFileSync } = await import("fs");
    vi.mocked(writeFileSync).mockClear();

    fetchMock
      .mockReturnValueOnce(
        makeResponse({
          ok: true,
          asset: { id: "asset-1", title: "Reel Captación" },
          files: [
            {
              evidenceId: "ev-1",
              proposalId: "prop-1",
              fileName: "toma-fachada.mp4",
              mimeType: "video/mp4",
              storagePath: "tenant/asset/file.mp4",
              signedUrl: "https://signed.example.com/file.mp4",
              uploadedAt: "2026-05-13T00:00:00Z"
            }
          ]
        })
      )
      .mockResolvedValueOnce(
        new Response(Uint8Array.from([1, 2, 3]), { status: 200 })
      );

    const client = new BridgeClient(CONFIG);
    await handleDownloadAssetFiles(client, {
      assetId: "asset-1",
      assetSlug: "../../../../etc",
      localLayout: "legacy"
    }, "/workspace");

    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("context/activos/..-..-..-..-etc/ev-1__toma-fachada.mp4"),
      expect.any(Buffer)
    );
  });

  it("preserva evidencias homónimas sin sobrescribirlas", async () => {
    fetchMock
      .mockReturnValueOnce(
        makeResponse({
          ok: true,
          asset: { id: "asset-1", title: "Reel Captación" },
          files: [
            {
              evidenceId: "ev-1",
              proposalId: "prop-1",
              fileName: "pieza.png",
              mimeType: "image/png",
              storagePath: "tenant/asset/pieza-1.png",
              signedUrl: "https://signed.example.com/pieza-1.png",
              uploadedAt: "2026-05-13T00:00:00Z"
            },
            {
              evidenceId: "ev-2",
              proposalId: "prop-2",
              fileName: "pieza.png",
              mimeType: "image/png",
              storagePath: "tenant/asset/pieza-2.png",
              signedUrl: "https://signed.example.com/pieza-2.png",
              uploadedAt: "2026-05-13T00:10:00Z"
            }
          ]
        })
      )
      .mockResolvedValueOnce(new Response(Uint8Array.from([1]), { status: 200 }))
      .mockResolvedValueOnce(new Response(Uint8Array.from([2]), { status: 200 }));

    const { writeFileSync } = await import("fs");
    vi.mocked(writeFileSync).mockClear();

    const client = new BridgeClient(CONFIG);
    await handleDownloadAssetFiles(client, {
      assetId: "asset-1",
      assetSlug: "reel-captacion",
      localLayout: "legacy"
    }, "/workspace");

    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("context/activos/reel-captacion/ev-1__pieza.png"),
      expect.any(Buffer)
    );
    expect(writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("context/activos/reel-captacion/ev-2__pieza.png"),
      expect.any(Buffer)
    );
  });
});
