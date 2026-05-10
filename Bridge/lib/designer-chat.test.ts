/**
 * IMPL-20260510-02
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-03_chat_asistente_produccion_disenador.md
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mock de @google/generative-ai al nivel de modulo ────────────────────────
// Vitest hoista vi.mock — se debe declarar antes del import del modulo que lo usa.

const mockGenerateContent = vi.fn();

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: mockGenerateContent
    }))
  }))
}));

import { buildSystemPrompt, callGemini, type AssetContext } from "./designer-chat";

// ─── buildSystemPrompt ────────────────────────────────────────────────────────

describe("buildSystemPrompt — sin contexto de activo", () => {
  it("incluye reglas base del asistente", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("asistente senior de produccion creativa");
    expect(prompt).toContain("Adobe Firefly");
    expect(prompt).toContain("Eso esta fuera de mi area");
  });

  it("no incluye bloque de contexto del activo", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).not.toContain("Contexto del activo activo");
    expect(prompt).not.toContain("Herramienta asignada:");
  });
});

describe("buildSystemPrompt — con contexto de activo", () => {
  const ctx: AssetContext = {
    tool: "Adobe Firefly",
    promptText: "Imagen de producto en fondo blanco",
    format: "cuadrado_1_1",
    name: "Banner principal"
  };

  it("incluye el nombre de la herramienta asignada", () => {
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain("Adobe Firefly");
    expect(prompt).toContain("Herramienta asignada: Adobe Firefly");
  });

  it("incluye el prompt vigente del activo", () => {
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain("Imagen de producto en fondo blanco");
    expect(prompt).toContain("Prompt vigente:");
  });

  it("incluye el formato requerido", () => {
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain("cuadrado_1_1");
    expect(prompt).toContain("Formato requerido:");
  });

  it("incluye el nombre del activo", () => {
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain("Banner principal");
    expect(prompt).toContain("Nombre del activo:");
  });
});

// ─── callGemini — con mocks ───────────────────────────────────────────────────

describe("callGemini — mock de Gemini", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    mockGenerateContent.mockReset();
  });

  it("devuelve el texto de la respuesta cuando Gemini responde correctamente", async () => {
    mockGenerateContent.mockResolvedValue({
      response: { text: () => "Ajusta el contraste en Express." }
    });

    const result = await callGemini("La imagen no convence, que hago?");
    expect(result).toBe("Ajusta el contraste en Express.");
  });

  it("devuelve mensaje de fallback si Gemini lanza un error", async () => {
    mockGenerateContent.mockRejectedValue(new Error("Network error"));

    const result = await callGemini("Pregunta cualquiera");
    expect(result).toBe("No pude conectarme al asistente. Intenta de nuevo.");
  });

  it("devuelve fallback si no hay GEMINI_API_KEY", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    const result = await callGemini("Pregunta sin clave");
    expect(result).toBe("No pude conectarme al asistente. Intenta de nuevo.");
  });
});
