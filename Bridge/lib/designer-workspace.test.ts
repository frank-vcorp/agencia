/**
 * IMPL-20260506-44
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-40_modelo_ejecucion_disenador_sesiones_y_estados.md
 */
import { describe, expect, it } from "vitest";

import {
  deriveDailyStats,
  getAvailableActions,
  mapAssetStatusToDesignerStatus,
  scoreDesignerTask,
  suggestCreativeTool,
  type DesignerTask,
  type DesignerTaskStatus
} from "./designer-workspace";

// ─── Helpers de fixture ───────────────────────────────────────────────────────

function baseTask(overrides: Partial<DesignerTask> = {}): DesignerTask {
  return {
    assetId: "asset-1",
    assetTitle: "Banner principal",
    projectId: "proj-1",
    projectName: "Proyecto Demo",
    clientName: "Cliente Demo",
    pieceTypeCode: "imagen",
    applicationCode: "instagram",
    formatCode: "cuadrado_1_1",
    status: "ready_to_start",
    promptText: "Crea una imagen de un producto en fondo blanco",
    promptVersion: 1,
    briefId: "brief-1",
    suggestedTool: "firefly",
    priorityScore: 35,
    priorityReason: "Listo para empezar",
    suggestedAction: "Iniciar tarea",
    updatedAt: "2026-05-06T10:00:00.000Z",
    ...overrides
  };
}

// ─── mapAssetStatusToDesignerStatus ──────────────────────────────────────────

describe("mapAssetStatusToDesignerStatus", () => {
  const casos: Array<[string, DesignerTaskStatus]> = [
    ["draft", "ready_to_start"],
    ["in_progress", "in_progress"],
    ["in_review", "ready_for_review"],
    ["approved", "completed"],
    ["delivered", "completed"]
  ];

  it.each(casos)("mapea estado de activo '%s' a '%s'", (assetStatus, expected) => {
    expect(mapAssetStatusToDesignerStatus(assetStatus)).toBe(expected);
  });

  it("estado desconocido cae en ready_to_start como fallback seguro", () => {
    expect(mapAssetStatusToDesignerStatus("estado_inexistente")).toBe("ready_to_start");
  });
});

// ─── suggestCreativeTool ──────────────────────────────────────────────────────

describe("suggestCreativeTool", () => {
  it("sugiere firefly para imagenes, portadas y banners", () => {
    expect(suggestCreativeTool("imagen")).toBe("firefly");
    expect(suggestCreativeTool("portada")).toBe("firefly");
    expect(suggestCreativeTool("banner")).toBe("firefly");
  });

  it("sugiere adobe_express para formatos de video y movimiento", () => {
    expect(suggestCreativeTool("carousel")).toBe("adobe_express");
    expect(suggestCreativeTool("historia")).toBe("adobe_express");
    expect(suggestCreativeTool("reel")).toBe("adobe_express");
    expect(suggestCreativeTool("video")).toBe("adobe_express");
  });

  it("sugiere other para copy y anuncio de texto", () => {
    expect(suggestCreativeTool("copy")).toBe("other");
    expect(suggestCreativeTool("anuncio_texto")).toBe("other");
  });

  it("sugiere photoshop como fallback para tipos no catalogados", () => {
    expect(suggestCreativeTool("tipo_nuevo")).toBe("photoshop");
    expect(suggestCreativeTool("landing_section")).toBe("photoshop");
  });
});

// ─── getAvailableActions ──────────────────────────────────────────────────────

describe("getAvailableActions", () => {
  it("ready_to_start solo permite iniciar", () => {
    expect(getAvailableActions("ready_to_start")).toEqual(["start"]);
  });

  it("in_progress permite bloquear, terminar y marcar para revision", () => {
    const actions = getAvailableActions("in_progress");
    expect(actions).toContain("block");
    expect(actions).toContain("finish");
    expect(actions).toContain("ready_for_review");
  });

  it("blocked solo permite retomar", () => {
    expect(getAvailableActions("blocked")).toEqual(["resume"]);
  });

  it("ready_for_review solo permite terminar", () => {
    expect(getAvailableActions("ready_for_review")).toEqual(["finish"]);
  });

  it("completed no permite ninguna accion", () => {
    expect(getAvailableActions("completed")).toHaveLength(0);
  });
});

// ─── scoreDesignerTask ────────────────────────────────────────────────────────

describe("scoreDesignerTask", () => {
  it("tarea in_progress con prompt obtiene el score mas alto", () => {
    const score = scoreDesignerTask({ status: "in_progress", promptText: "prompt activo" });
    expect(score).toBe(65); // 50 (in_progress) + 15 (prompt)
  });

  it("tarea in_progress sin prompt obtiene 50 puntos base", () => {
    const score = scoreDesignerTask({ status: "in_progress", promptText: null });
    expect(score).toBe(50);
  });

  it("tarea ready_for_review obtiene 45 puntos con prompt", () => {
    const score = scoreDesignerTask({ status: "ready_for_review", promptText: "prompt" });
    expect(score).toBe(45); // 30 + 15
  });

  it("tarea ready_to_start con prompt obtiene 35 puntos", () => {
    const score = scoreDesignerTask({ status: "ready_to_start", promptText: "prompt" });
    expect(score).toBe(35); // 20 + 15
  });

  it("tarea completed obtiene 0 puntos", () => {
    const score = scoreDesignerTask({ status: "completed", promptText: null });
    expect(score).toBe(0);
  });
});

// ─── deriveDailyStats ────────────────────────────────────────────────────────

describe("deriveDailyStats", () => {
  it("devuelve ceros con lista vacia", () => {
    const stats = deriveDailyStats([]);
    expect(stats.completedCount).toBe(0);
    expect(stats.inProgressCount).toBe(0);
    expect(stats.readyToStartCount).toBe(0);
    expect(stats.blockedCount).toBe(0);
  });

  it("cuenta correctamente cada estado", () => {
    const tasks: DesignerTask[] = [
      baseTask({ status: "in_progress" }),
      baseTask({ assetId: "a2", status: "ready_to_start" }),
      baseTask({ assetId: "a3", status: "ready_to_start" }),
      baseTask({ assetId: "a4", status: "completed" }),
      baseTask({ assetId: "a5", status: "blocked" })
    ];
    const stats = deriveDailyStats(tasks);
    expect(stats.inProgressCount).toBe(1);
    expect(stats.readyToStartCount).toBe(2);
    expect(stats.completedCount).toBe(1);
    expect(stats.blockedCount).toBe(1);
  });

  it("incluye nota honesta sobre tiempo efectivo no disponible en V1", () => {
    const stats = deriveDailyStats([]);
    expect(stats.effectiveMinutesNote).toMatch(/V1/);
    expect(stats.effectiveMinutesNote).toMatch(/work_sessions/);
  });
});
