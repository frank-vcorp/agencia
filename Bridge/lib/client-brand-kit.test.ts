/**
 * IMPL-20260613-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-02_brand_kit_cliente_bridge_v1.md
 *            context/SPECs/SPEC_ARCH-20260612-05_gestion_clientes_crud_detalle_entidades_relacionadas.md
 *
 * Tests del helper `uploadBrandKitLogo`:
 *  - valida MIME y tamano antes de tocar Supabase
 *  - valida tenant/cliente
 *  - sube el binario a Storage y persiste la URL en clients.brand_kit.logos
 *  - maneja errores de storage y postgrest de forma tipada
 *
 * NOTA: mockeamos `./supabase` y `./tenant` para evitar depender de constantes
 * a nivel de módulo (vi.stubEnv se aplica después de la importación).
 */
import { describe, expect, it, beforeEach, afterEach, vi, type MockInstance } from "vitest";

vi.mock("./supabase", () => ({
  supabaseEnv: {
    url: "https://fake.supabase.co",
    anonKey: "fake-anon-key",
    projectRef: "fake",
    defaultTenant: "vectoria"
  },
  isSupabaseConfigured: true,
  isSupabaseProjectLinked: true
}));

import {
  BRAND_KIT_BUCKET,
  BRAND_KIT_LOGO_MAX_BYTES,
  BrandKitLogoError,
  emptyBrandKit,
  uploadBrandKitLogo
} from "./client-brand-kit";

const TENANT_ID = "00000000-0000-0000-0000-000000000001";
const CLIENT_ID = "00000000-0000-0000-0000-0000000000a1";

function makeJsonResponse<T>(data: T, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" }
    })
  );
}

function makeEmptyJson(status = 200) {
  return Promise.resolve(
    new Response("[]", { status, headers: { "Content-Type": "application/json" } })
  );
}

function makeTextResponse(text: string, status = 200) {
  return Promise.resolve(new Response(text, { status }));
}

function makeFakeFile(name: string, type: string, sizeBytes: number): File {
  // Crea un Blob real con `sizeBytes` bytes en cero para que `arrayBuffer()` funcione.
  const data = new Uint8Array(sizeBytes);
  return new File([data], name, { type });
}

function makeFileLike(name: string, type: string, sizeBytes: number) {
  return {
    name,
    type,
    size: sizeBytes,
    arrayBuffer: async () => new Uint8Array(sizeBytes).buffer
  };
}

describe("emptyBrandKit", () => {
  it("retorna un brand kit con arrays vacios y campos nulos", () => {
    const bk = emptyBrandKit();
    expect(bk.logos).toEqual([]);
    expect(bk.colores).toEqual([]);
    expect(bk.tipografias).toEqual([]);
    expect(bk.tono_marca).toEqual([]);
    expect(bk.estilo_visual).toBe("");
    expect(bk.carpeta_compartida).toBeNull();
    expect(bk.notas).toBeNull();
  });
});

describe("uploadBrandKitLogo", () => {
  let fetchMock: MockInstance;

  beforeEach(() => {
    fetchMock = vi.spyOn(globalThis, "fetch");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fake.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fake-anon-key");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "fake-service-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("lanza supabase_no_configured si no hay env de Supabase", async () => {
    vi.unstubAllEnvs();
    await expect(
      uploadBrandKitLogo({
        clientId: CLIENT_ID,
        file: makeFileLike("logo.png", "image/png", 1024)
      })
    ).rejects.toBeInstanceOf(BrandKitLogoError);
  });

  it("lanza tenant_not_found si la consulta de tenant no devuelve resultados", async () => {
    fetchMock.mockReturnValueOnce(makeEmptyJson()); // tenants
    await expect(
      uploadBrandKitLogo({
        clientId: CLIENT_ID,
        file: makeFileLike("logo.png", "image/png", 1024)
      })
    ).rejects.toMatchObject({ code: "tenant_not_found" });
  });

  it("lanza client_not_found si el cliente no existe en el tenant", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }])) // tenants
      .mockReturnValueOnce(makeEmptyJson()); // clients lookup
    await expect(
      uploadBrandKitLogo({
        clientId: CLIENT_ID,
        file: makeFileLike("logo.png", "image/png", 1024)
      })
    ).rejects.toMatchObject({ code: "client_not_found" });
  });

  it("lanza invalid_mime si el archivo no es una imagen permitida", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }]))
      .mockReturnValueOnce(
        makeJsonResponse([
          {
            id: CLIENT_ID,
            name: "Acme",
            legal_name: null,
            status: "active",
            primary_contact_name: null,
            primary_contact_email: null,
            primary_contact_whatsapp: null,
            primary_contact_channel: null,
            notes: null,
            brand_kit: null
          }
        ])
      );

    await expect(
      uploadBrandKitLogo({
        clientId: CLIENT_ID,
        file: makeFileLike("virus.exe", "application/octet-stream", 1024)
      })
    ).rejects.toMatchObject({ code: "invalid_mime" });
  });

  it("lanza file_too_large si el archivo supera el limite", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }]))
      .mockReturnValueOnce(
        makeJsonResponse([
          {
            id: CLIENT_ID,
            name: "Acme",
            legal_name: null,
            status: "active",
            primary_contact_name: null,
            primary_contact_email: null,
            primary_contact_whatsapp: null,
            primary_contact_channel: null,
            notes: null,
            brand_kit: null
          }
        ])
      );

    await expect(
      uploadBrandKitLogo({
        clientId: CLIENT_ID,
        file: makeFileLike("huge.png", "image/png", BRAND_KIT_LOGO_MAX_BYTES + 1)
      })
    ).rejects.toMatchObject({ code: "file_too_large" });
  });

  it("sube el archivo, devuelve URL publica y persiste en brand_kit.logos", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }])) // tenant lookup
      .mockReturnValueOnce(
        // client lookup (sin brand_kit previo)
        makeJsonResponse([
          {
            id: CLIENT_ID,
            name: "Acme",
            legal_name: null,
            status: "active",
            primary_contact_name: null,
            primary_contact_email: null,
            primary_contact_whatsapp: null,
            primary_contact_channel: null,
            notes: null,
            brand_kit: null
          }
        ])
      )
      .mockReturnValueOnce(makeTextResponse("", 200)) // storage upload
      .mockReturnValueOnce(makeJsonResponse([{ id: CLIENT_ID }])); // patch brand_kit

    const result = await uploadBrandKitLogo({
      clientId: CLIENT_ID,
      file: makeFileLike("logo.png", "image/png", 2048),
      nombre: "Principal"
    });

    expect(result.logo.nombre).toBe("Principal");
    expect(result.logo.url).toMatch(
      new RegExp(`^https://fake\\.supabase\\.co/storage/v1/object/public/${BRAND_KIT_BUCKET}/${TENANT_ID}/${CLIENT_ID}/`)
    );
    expect(result.logo.storage_path.startsWith(`${TENANT_ID}/${CLIENT_ID}/`)).toBe(true);
    expect(result.brand_kit.logos).toHaveLength(1);
    expect(result.brand_kit.logos[0]).toEqual(result.logo);

    // Storage upload call
    const uploadCall = fetchMock.mock.calls[2];
    const uploadUrl = String(uploadCall[0]);
    const uploadInit = uploadCall[1] as RequestInit;
    expect(uploadUrl).toContain(`/storage/v1/object/${BRAND_KIT_BUCKET}/${TENANT_ID}/${CLIENT_ID}/`);
    expect(uploadInit.method).toBe("POST");
    const uploadHeaders = (uploadInit.headers ?? {}) as Record<string, string>;
    expect(uploadHeaders["Content-Type"]).toBe("image/png");
    expect(uploadHeaders["x-upsert"]).toBe("true");

    // PATCH call to clients
    const patchCall = fetchMock.mock.calls[3];
    const patchUrl = String(patchCall[0]);
    const patchInit = patchCall[1] as RequestInit;
    expect(patchUrl).toContain("/rest/v1/clients?");
    expect(patchUrl).toContain(`id=eq.${CLIENT_ID}`);
    expect(patchUrl).toContain(`tenant_id=eq.${TENANT_ID}`);
    expect(patchInit.method).toBe("PATCH");
    const body = JSON.parse(String(patchInit.body));
    expect(body.brand_kit.logos).toHaveLength(1);
    expect(body.brand_kit.logos[0].nombre).toBe("Principal");
    expect(body.brand_kit.logos[0].url).toBe(result.logo.url);
  });

  it("reemplaza el logo existente con el mismo nombre", async () => {
    const existingLogos = [
      {
        nombre: "Principal",
        storage_path: `${TENANT_ID}/${CLIENT_ID}/old.png`,
        url: "https://fake.supabase.co/storage/v1/object/public/brand-kits/old.png"
      },
      {
        nombre: "Secundario",
        storage_path: `${TENANT_ID}/${CLIENT_ID}/sec.png`,
        url: "https://fake.supabase.co/storage/v1/object/public/brand-kits/sec.png"
      }
    ];

    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }]))
      .mockReturnValueOnce(
        makeJsonResponse([
          {
            id: CLIENT_ID,
            name: "Acme",
            legal_name: null,
            status: "active",
            primary_contact_name: null,
            primary_contact_email: null,
            primary_contact_whatsapp: null,
            primary_contact_channel: null,
            notes: null,
            brand_kit: {
              logos: existingLogos,
              colores: [],
              tipografias: [],
              estilo_visual: "",
              tono_marca: [],
              carpeta_compartida: null,
              notas: null
            }
          }
        ])
      )
      .mockReturnValueOnce(makeTextResponse("", 200))
      .mockReturnValueOnce(makeJsonResponse([{ id: CLIENT_ID }]));

    const result = await uploadBrandKitLogo({
      clientId: CLIENT_ID,
      file: makeFileLike("logo.png", "image/png", 1024),
      nombre: "Principal"
    });

    expect(result.brand_kit.logos).toHaveLength(2);
    expect(result.brand_kit.logos.find((l) => l.nombre === "Principal")?.url).toBe(result.logo.url);
    expect(result.brand_kit.logos.find((l) => l.nombre === "Secundario")?.url).toBe(existingLogos[1].url);
  });

  it("lanza storage_upload_error si Supabase Storage responde != 2xx", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }]))
      .mockReturnValueOnce(
        makeJsonResponse([
          {
            id: CLIENT_ID,
            name: "Acme",
            legal_name: null,
            status: "active",
            primary_contact_name: null,
            primary_contact_email: null,
            primary_contact_whatsapp: null,
            primary_contact_channel: null,
            notes: null,
            brand_kit: null
          }
        ])
      )
      .mockReturnValueOnce(makeTextResponse("boom", 500));

    await expect(
      uploadBrandKitLogo({
        clientId: CLIENT_ID,
        file: makeFileLike("logo.png", "image/png", 1024)
      })
    ).rejects.toMatchObject({ code: "storage_upload_error" });
  });

  it("sanea el nombre del archivo y conserva la extension", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }]))
      .mockReturnValueOnce(
        makeJsonResponse([
          {
            id: CLIENT_ID,
            name: "Acme",
            legal_name: null,
            status: "active",
            primary_contact_name: null,
            primary_contact_email: null,
            primary_contact_whatsapp: null,
            primary_contact_channel: null,
            notes: null,
            brand_kit: null
          }
        ])
      )
      .mockReturnValueOnce(makeTextResponse("", 200))
      .mockReturnValueOnce(makeJsonResponse([{ id: CLIENT_ID }]));

    const result = await uploadBrandKitLogo({
      clientId: CLIENT_ID,
      file: makeFileLike("logo oficial v2.png", "image/png", 1024)
    });

    // El path debe terminar en .png y la base saneada
    expect(result.logo.storage_path).toMatch(/\.png$/);
    expect(result.logo.storage_path).toContain(`${TENANT_ID}/${CLIENT_ID}/`);
    expect(result.logo.storage_path).not.toMatch(/[^a-zA-Z0-9_\-./]/);
  });

  it("usa 'Principal' como nombre por defecto si no se pasa", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }]))
      .mockReturnValueOnce(
        makeJsonResponse([
          {
            id: CLIENT_ID,
            name: "Acme",
            legal_name: null,
            status: "active",
            primary_contact_name: null,
            primary_contact_email: null,
            primary_contact_whatsapp: null,
            primary_contact_channel: null,
            notes: null,
            brand_kit: null
          }
        ])
      )
      .mockReturnValueOnce(makeTextResponse("", 200))
      .mockReturnValueOnce(makeJsonResponse([{ id: CLIENT_ID }]));

    const result = await uploadBrandKitLogo({
      clientId: CLIENT_ID,
      file: makeFileLike("logo.svg", "image/svg+xml", 512)
    });
    expect(result.logo.nombre).toBe("Principal");
  });

  it("maneja archivos PDF rechazandolos por MIME invalido", async () => {
    fetchMock
      .mockReturnValueOnce(makeJsonResponse([{ id: TENANT_ID, slug: "vectoria" }]))
      .mockReturnValueOnce(
        makeJsonResponse([
          {
            id: CLIENT_ID,
            name: "Acme",
            legal_name: null,
            status: "active",
            primary_contact_name: null,
            primary_contact_email: null,
            primary_contact_whatsapp: null,
            primary_contact_channel: null,
            notes: null,
            brand_kit: null
          }
        ])
      );

    await expect(
      uploadBrandKitLogo({
        clientId: CLIENT_ID,
        file: makeFileLike("doc.pdf", "application/pdf", 1024)
      })
    ).rejects.toMatchObject({ code: "invalid_mime" });
  });
});
