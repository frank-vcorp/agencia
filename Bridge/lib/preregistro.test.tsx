/**
 * IMPL-20260610-06
 * Respaldo: context/SPECs/SPEC_ARCH-20260610-05_preregistro_cliente_vendedor.md
 *
 * Tests del flujo de pre-registro (vendedor):
 *   1. Helpers puros (normalizePhoneMX, generateWhatsappUrl)
 *   2. Endpoint POST /api/v1/preregistro (validación, éxito, teléfono inválido)
 *   3. Página /cliente/preregistro (render del formulario)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { POST } from "@/app/api/v1/preregistro/route";
import {
  generateWhatsappUrl,
  normalizePhoneMX
} from "@/lib/preregistro-helpers";
import PreregistroPage from "@/app/cliente/preregistro/page";

// ─── Mocks de dependencias del endpoint ──────────────────────────────────────
// Hoisted: el mock de @/lib/assets debe declararse antes de importar la ruta.
vi.mock("@/lib/assets", () => ({
  createClient: vi.fn(),
  createProject: vi.fn()
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantIdBySlug: vi.fn()
}));

// Importamos los mocks DESPUÉS de declararlos para tener referencias tipadas.
import { createClient, createProject } from "@/lib/assets";
import { resolveTenantIdBySlug } from "@/lib/tenant";

const mockedCreateClient = vi.mocked(createClient);
const mockedCreateProject = vi.mocked(createProject);
const mockedResolveTenant = vi.mocked(resolveTenantIdBySlug);

// ─── 1. Helpers ──────────────────────────────────────────────────────────────
describe("normalizePhoneMX", () => {
  it("agrega prefijo +52 a un número de 10 dígitos", () => {
    expect(normalizePhoneMX("4423207082")).toBe("+524423207082");
  });

  it("elimina espacios y guiones antes de validar", () => {
    expect(normalizePhoneMX("442 320 7082")).toBe("+524423207082");
    expect(normalizePhoneMX("442-320-7082")).toBe("+524423207082");
  });

  it("elimina paréntesis y otros caracteres no numéricos", () => {
    expect(normalizePhoneMX("(442) 320 7082")).toBe("+524423207082");
  });

  it("devuelve el input sin modificar si no tiene 10 dígitos", () => {
    expect(normalizePhoneMX("123")).toBe("123");
    expect(normalizePhoneMX("12345678901234")).toBe("12345678901234");
  });

  it("devuelve el input tal cual si ya trae prefijo +52 (13 dígitos)", () => {
    // +52 + 10 dígitos = 12 dígitos; con el "+" se cuentan 13, no 10.
    expect(normalizePhoneMX("+524423207082")).toBe("+524423207082");
  });

  it("devuelve string vacío si recibe string vacío", () => {
    expect(normalizePhoneMX("")).toBe("");
  });
});

describe("generateWhatsappUrl", () => {
  it("construye URL wa.me con teléfono sin '+' y mensaje de briefing", () => {
    const url = generateWhatsappUrl("proj-abc-123", "+524423207082");
    expect(url).toBe(
      "https://wa.me/524423207082?text=Hola%21%20Te%20comparto%20el%20link%20para%20tu%20brief%3A%20https%3A%2F%2Fvectoria-zeta.vercel.app%2Fcliente%2Fproyecto%2Fproj-abc-123"
    );
  });

  it("acepta teléfono sin prefijo '+' (solo dígitos)", () => {
    const url = generateWhatsappUrl("proj-abc-123", "524423207082");
    expect(url).toContain("wa.me/524423207082");
  });

  it("incluye el projectId en la URL base del proyecto", () => {
    const url = generateWhatsappUrl("mi-uuid-xyz", "+521234567890");
    expect(url).toContain(
      "https%3A%2F%2Fvectoria-zeta.vercel.app%2Fcliente%2Fproyecto%2Fmi-uuid-xyz"
    );
  });

  it("codifica caracteres especiales del projectId en la URL", () => {
    const url = generateWhatsappUrl("proj/with spaces", "+521234567890");
    // "/" y " " deben quedar encodeados en la URL final del mensaje
    expect(url).toContain("proj%2Fwith%20spaces");
  });
});

// ─── 2. Endpoint POST /api/v1/preregistro ────────────────────────────────────
describe("POST /api/v1/preregistro — endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeRequest(body: unknown): Request {
    return new Request("http://localhost/api/v1/preregistro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  }

  it("devuelve 400 si falta clientName", async () => {
    const res = await POST(
      makeRequest({ clientPhone: "4423207082", businessName: "Taller" }) as unknown as Request
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/clientName/);
  });

  it("devuelve 400 si falta clientPhone", async () => {
    const res = await POST(
      makeRequest({ clientName: "Juan", businessName: "Taller" }) as unknown as Request
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it("devuelve 400 si falta businessName", async () => {
    const res = await POST(
      makeRequest({ clientName: "Juan", clientPhone: "4423207082" }) as unknown as Request
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it("devuelve 400 si el cuerpo no es JSON válido", async () => {
    const req = new Request("http://localhost/api/v1/preregistro", {
      method: "POST",
      body: "no-es-json"
    });
    const res = await POST(req as unknown as Request);
    expect(res.status).toBe(400);
  });

  it("devuelve 400 si clientPhone tiene menos de 10 dígitos", async () => {
    const res = await POST(
      makeRequest({
        clientName: "Juan",
        clientPhone: "12345",
        businessName: "Taller"
      }) as unknown as Request
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/10 d[ií]gitos/);
  });

  it("devuelve 400 si clientPhone contiene letras", async () => {
    const res = await POST(
      makeRequest({
        clientName: "Juan",
        clientPhone: "44232abcde",
        businessName: "Taller"
      }) as unknown as Request
    );
    expect(res.status).toBe(400);
  });

  it("devuelve 200 con clientId, projectId y whatsappUrl en caso exitoso", async () => {
    mockedResolveTenant.mockResolvedValue("tenant-uuid-001");
    mockedCreateClient.mockResolvedValue({
      id: "client-uuid-001",
      name: "Juan Pérez",
      status: "prospect"
    });
    mockedCreateProject.mockResolvedValue({
      id: "project-uuid-001",
      name: "Preregistro - Taller Rodamax",
      project_type: "interno",
      status: "draft",
      client_id: "client-uuid-001"
    });

    const res = await POST(
      makeRequest({
        clientName: "Juan Pérez",
        clientPhone: "4423207082",
        businessName: "Taller Rodamax"
      }) as unknown as Request
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.clientId).toBe("client-uuid-001");
    expect(data.projectId).toBe("project-uuid-001");
    expect(data.whatsappUrl).toContain("wa.me/524423207082");
    expect(data.whatsappUrl).toContain("project-uuid-001");
  });

  it("llama a createClient con status=prospect y teléfono normalizado a +52", async () => {
    mockedResolveTenant.mockResolvedValue("tenant-uuid-001");
    mockedCreateClient.mockResolvedValue({
      id: "c1",
      name: "Ana",
      status: "prospect"
    });
    mockedCreateProject.mockResolvedValue({
      id: "p1",
      name: "Preregistro - Negocio X",
      project_type: "interno",
      status: "draft",
      client_id: "c1"
    });

    await POST(
      makeRequest({
        clientName: "Ana",
        clientPhone: "4423207082",
        businessName: "Negocio X"
      }) as unknown as Request
    );

    expect(mockedCreateClient).toHaveBeenCalledWith("tenant-uuid-001", {
      name: "Ana",
      status: "prospect",
      primaryContactName: "Ana",
      primaryContactWhatsapp: "+524423207082"
    });
  });

  it("llama a createProject con nombre 'Preregistro - [negocio]' y status=draft", async () => {
    mockedResolveTenant.mockResolvedValue("tenant-uuid-001");
    mockedCreateClient.mockResolvedValue({
      id: "c1",
      name: "Ana",
      status: "prospect"
    });
    mockedCreateProject.mockResolvedValue({
      id: "p1",
      name: "Preregistro - Negocio X",
      project_type: "interno",
      status: "draft",
      client_id: "c1"
    });

    await POST(
      makeRequest({
        clientName: "Ana",
        clientPhone: "4423207082",
        businessName: "Negocio X"
      }) as unknown as Request
    );

    expect(mockedCreateProject).toHaveBeenCalledWith("tenant-uuid-001", {
      clientId: "c1",
      name: "Preregistro - Negocio X",
      projectType: "interno",
      status: "draft"
    });
  });

  it("devuelve 500 si el tenant no se puede resolver", async () => {
    mockedResolveTenant.mockResolvedValue(null);

    const res = await POST(
      makeRequest({
        clientName: "Ana",
        clientPhone: "4423207082",
        businessName: "X"
      }) as unknown as Request
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/Tenant/);
  });

  it("devuelve 500 si createClient lanza un error", async () => {
    mockedResolveTenant.mockResolvedValue("tenant-uuid-001");
    mockedCreateClient.mockRejectedValue(new Error("clients:create_failed"));

    const res = await POST(
      makeRequest({
        clientName: "Ana",
        clientPhone: "4423207082",
        businessName: "X"
      }) as unknown as Request
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("clients:create_failed");
  });
});

// ─── 3. Página /cliente/preregistro ──────────────────────────────────────────
describe("PreregistroPage — render", () => {
  it("muestra los 3 inputs requeridos y el botón de envío", () => {
    render(<PreregistroPage />);

    // El campo clientName (texto)
    expect(screen.getByPlaceholderText("Ej: Juan Pérez")).toBeInTheDocument();
    // El campo clientPhone (tel)
    expect(screen.getByPlaceholderText("Ej: 4423207082")).toBeInTheDocument();
    // El campo businessName (texto)
    expect(screen.getByPlaceholderText("Ej: Taller Rodamax")).toBeInTheDocument();

    // Botón de submit
    expect(
      screen.getByRole("button", { name: /Crear pre-registro/i })
    ).toBeInTheDocument();
  });

  it("muestra el título y subtítulo de la página", () => {
    render(<PreregistroPage />);
    expect(screen.getByText("Pre-registro de cliente")).toBeInTheDocument();
    expect(screen.getByText("Captura rápida de prospecto")).toBeInTheDocument();
  });
});
