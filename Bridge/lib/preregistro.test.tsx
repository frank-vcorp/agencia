/**
 * IMPL-20260610-06
 * IMPL-20260613-01 - Tests del refactor: server action + lógica compartida
 * Respaldo: context/SPECs/SPEC_ARCH-20260610-05_preregistro_cliente_vendedor.md
 *
 * Tests del flujo de pre-registro (vendedor):
 *   1. Helpers puros (normalizePhoneMX, generateWhatsappUrl)
 *   2. Lógica de negocio (validatePreregistroInput, createPreregistro)
 *   3. Endpoint POST /api/v1/preregistro
 *   4. Server action submitPreregistroAction
 *   5. Página /cliente/preregistro + PreregistroForm
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { POST } from "@/app/api/v1/preregistro/route";
import {
  generateWhatsappUrl,
  normalizePhoneMX
} from "@/lib/preregistro-helpers";
import {
  createPreregistro,
  validatePreregistroInput
} from "@/lib/preregistro";
import { submitPreregistroAction } from "@/app/cliente/preregistro/actions";
import PreregistroPage from "@/app/cliente/preregistro/page";

// ─── Mocks de dependencias del endpoint y de la lógica de negocio ──────────
// Hoisted: los mocks deben declararse antes de importar la ruta / la lógica.
vi.mock("@/lib/assets", () => ({
  createClient: vi.fn(),
  createProject: vi.fn()
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantIdBySlug: vi.fn()
}));

vi.mock("@/lib/supabase", () => ({
  supabaseEnv: {
    defaultTenant: "vectoria",
    url: "https://test.supabase.co",
    anonKey: "test-anon-key",
    projectRef: "test-project"
  }
}));

// Importamos los mocks DESPUÉS de declararlos para tener referencias tipadas.
import { createClient, createProject } from "@/lib/assets";
import { resolveTenantIdBySlug } from "@/lib/tenant";

const mockedCreateClient = vi.mocked(createClient);
const mockedCreateProject = vi.mocked(createProject);
const mockedResolveTenant = vi.mocked(resolveTenantIdBySlug);

function makeJsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/v1/preregistro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

const validClient = { id: "client-uuid-001", name: "Juan", status: "prospect" };
const validProject = {
  id: "project-uuid-001",
  name: "Preregistro - Taller Rodamax",
  project_type: "interno",
  status: "draft",
  client_id: "client-uuid-001"
};

function setupHappyPath() {
  mockedResolveTenant.mockResolvedValue("tenant-uuid-001");
  mockedCreateClient.mockResolvedValue(validClient);
  mockedCreateProject.mockResolvedValue(validProject);
}

// ─── 1. Helpers ────────────────────────────────────────────────────────────
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
    expect(url).toContain("proj%2Fwith%20spaces");
  });
});

// ─── 2. Lógica de negocio (lib/preregistro.ts) ──────────────────────────────
describe("validatePreregistroInput", () => {
  it("devuelve null si el input es válido", () => {
    expect(
      validatePreregistroInput({
        clientName: "Juan",
        clientPhone: "4423207082",
        businessName: "Taller"
      })
    ).toBeNull();
  });

  it("rechaza si falta clientName", () => {
    expect(
      validatePreregistroInput({ clientPhone: "4423207082", businessName: "X" })
    ).toMatch(/clientName/);
  });

  it("rechaza si falta clientPhone", () => {
    expect(
      validatePreregistroInput({ clientName: "Juan", businessName: "X" })
    ).toMatch(/clientPhone/);
  });

  it("rechaza si falta businessName", () => {
    expect(
      validatePreregistroInput({ clientName: "Juan", clientPhone: "4423207082" })
    ).toMatch(/businessName/);
  });

  it("rechaza si el teléfono no tiene 10 dígitos", () => {
    expect(
      validatePreregistroInput({
        clientName: "Juan",
        clientPhone: "12345",
        businessName: "X"
      })
    ).toMatch(/10 d[ií]gitos/);
  });

  it("rechaza si el teléfono contiene letras", () => {
    expect(
      validatePreregistroInput({
        clientName: "Juan",
        clientPhone: "44232abcde",
        businessName: "X"
      })
    ).toMatch(/10 d[ií]gitos/);
  });
});

describe("createPreregistro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lanza error de validación si falta un campo", async () => {
    await expect(
      createPreregistro({
        clientName: "",
        clientPhone: "4423207082",
        businessName: "X"
      })
    ).rejects.toThrow(/Campos requeridos/);
  });

  it("lanza error si el tenant no se puede resolver", async () => {
    mockedResolveTenant.mockResolvedValue(null);
    await expect(
      createPreregistro({
        clientName: "Juan",
        clientPhone: "4423207082",
        businessName: "X"
      })
    ).rejects.toThrow(/Tenant/);
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("crea cliente con status=prospect y teléfono normalizado", async () => {
    setupHappyPath();
    await createPreregistro({
      clientName: "Ana",
      clientPhone: "4423207082",
      businessName: "Negocio X"
    });
    expect(mockedCreateClient).toHaveBeenCalledWith("tenant-uuid-001", {
      name: "Ana",
      status: "prospect",
      primaryContactName: "Ana",
      primaryContactWhatsapp: "+524423207082"
    });
  });

  it("crea proyecto con nombre 'Preregistro - [negocio]' y status=draft", async () => {
    setupHappyPath();
    await createPreregistro({
      clientName: "Ana",
      clientPhone: "4423207082",
      businessName: "Negocio X"
    });
    expect(mockedCreateProject).toHaveBeenCalledWith("tenant-uuid-001", {
      clientId: "client-uuid-001",
      name: "Preregistro - Negocio X",
      projectType: "interno",
      status: "draft"
    });
  });

  it("devuelve ok=true con clientId, projectId y whatsappUrl", async () => {
    setupHappyPath();
    const result = await createPreregistro({
      clientName: "Juan Pérez",
      clientPhone: "4423207082",
      businessName: "Taller Rodamax"
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.clientId).toBe("client-uuid-001");
      expect(result.projectId).toBe("project-uuid-001");
      expect(result.whatsappUrl).toContain("wa.me/524423207082");
      expect(result.whatsappUrl).toContain("project-uuid-001");
    }
  });
});

// ─── 3. Endpoint POST /api/v1/preregistro ───────────────────────────────────
describe("POST /api/v1/preregistro — endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve 400 si falta clientName", async () => {
    const res = await POST(
      makeJsonRequest({ clientPhone: "4423207082", businessName: "Taller" })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/clientName/);
  });

  it("devuelve 400 si falta clientPhone", async () => {
    const res = await POST(
      makeJsonRequest({ clientName: "Juan", businessName: "Taller" })
    );
    expect(res.status).toBe(400);
  });

  it("devuelve 400 si falta businessName", async () => {
    const res = await POST(
      makeJsonRequest({ clientName: "Juan", clientPhone: "4423207082" })
    );
    expect(res.status).toBe(400);
  });

  it("devuelve 400 si el cuerpo no es JSON válido", async () => {
    const req = new Request("http://localhost/api/v1/preregistro", {
      method: "POST",
      body: "no-es-json"
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("devuelve 400 si clientPhone tiene menos de 10 dígitos", async () => {
    const res = await POST(
      makeJsonRequest({
        clientName: "Juan",
        clientPhone: "12345",
        businessName: "Taller"
      })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/10 d[ií]gitos/);
  });

  it("devuelve 400 si clientPhone contiene letras", async () => {
    const res = await POST(
      makeJsonRequest({
        clientName: "Juan",
        clientPhone: "44232abcde",
        businessName: "Taller"
      })
    );
    expect(res.status).toBe(400);
  });

  it("devuelve 200 con clientId, projectId y whatsappUrl en caso exitoso", async () => {
    setupHappyPath();
    const res = await POST(
      makeJsonRequest({
        clientName: "Juan Pérez",
        clientPhone: "4423207082",
        businessName: "Taller Rodamax"
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.clientId).toBe("client-uuid-001");
    expect(data.projectId).toBe("project-uuid-001");
    expect(data.whatsappUrl).toContain("wa.me/524423207082");
  });

  it("devuelve 500 si el tenant no se puede resolver", async () => {
    mockedResolveTenant.mockResolvedValue(null);
    const res = await POST(
      makeJsonRequest({
        clientName: "Ana",
        clientPhone: "4423207082",
        businessName: "X"
      })
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/Tenant/);
  });

  it("devuelve 500 si createClient lanza un error", async () => {
    mockedResolveTenant.mockResolvedValue("tenant-uuid-001");
    mockedCreateClient.mockRejectedValue(new Error("clients:create_failed"));
    const res = await POST(
      makeJsonRequest({
        clientName: "Ana",
        clientPhone: "4423207082",
        businessName: "X"
      })
    );
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("clients:create_failed");
  });
});

// ─── 4. Server action submitPreregistroAction ──────────────────────────────
describe("submitPreregistroAction (server action)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeFormData(fields: Record<string, string>): FormData {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    return fd;
  }

  it("devuelve status=error si falta clientName", async () => {
    const fd = makeFormData({ clientPhone: "4423207082", businessName: "X" });
    const state = await submitPreregistroAction({ status: "idle" }, fd);
    expect(state.status).toBe("error");
    if (state.status === "error") {
      expect(state.error).toMatch(/clientName/);
    }
  });

  it("devuelve status=error si clientPhone no tiene 10 dígitos", async () => {
    const fd = makeFormData({
      clientName: "Juan",
      clientPhone: "12345",
      businessName: "X"
    });
    const state = await submitPreregistroAction({ status: "idle" }, fd);
    expect(state.status).toBe("error");
    if (state.status === "error") {
      expect(state.error).toMatch(/10 d[ií]gitos/);
    }
  });

  it("devuelve status=success con clientId, projectId y whatsappUrl en caso exitoso", async () => {
    setupHappyPath();
    const fd = makeFormData({
      clientName: "Juan",
      clientPhone: "4423207082",
      businessName: "Taller Rodamax"
    });
    const state = await submitPreregistroAction({ status: "idle" }, fd);
    expect(state.status).toBe("success");
    if (state.status === "success") {
      expect(state.clientId).toBe("client-uuid-001");
      expect(state.projectId).toBe("project-uuid-001");
      expect(state.whatsappUrl).toContain("wa.me/524423207082");
    }
  });

  it("devuelve status=error si createPreregistro lanza una excepción de infraestructura", async () => {
    mockedResolveTenant.mockResolvedValue("tenant-uuid-001");
    mockedCreateClient.mockRejectedValue(new Error("clients:create_failed"));
    const fd = makeFormData({
      clientName: "Ana",
      clientPhone: "4423207082",
      businessName: "X"
    });
    const state = await submitPreregistroAction({ status: "idle" }, fd);
    expect(state.status).toBe("error");
    if (state.status === "error") {
      expect(state.error).toBe("clients:create_failed");
    }
  });
});

// ─── 5. Página /cliente/preregistro (server component) ─────────────────────
describe("PreregistroPage — render", () => {
  it("muestra el título, subtítulo y el formulario cliente", () => {
    render(<PreregistroPage />);

    expect(screen.getByText("Pre-registro de cliente")).toBeInTheDocument();
    expect(screen.getByText("Captura rápida de prospecto")).toBeInTheDocument();
    // El form cliente (PreregistroForm) debe estar presente
    expect(
      screen.getByRole("button", { name: /Crear pre-registro/i })
    ).toBeInTheDocument();
  });

  it("renderiza los 3 inputs requeridos del formulario", () => {
    render(<PreregistroPage />);
    expect(screen.getByPlaceholderText("Ej: Juan Pérez")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ej: 4423207082")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ej: Taller Rodamax")).toBeInTheDocument();
  });
});
