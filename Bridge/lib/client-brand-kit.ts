/**
 * IMPL-20260613-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-02_brand_kit_cliente_bridge_v1.md
 *            context/SPECs/SPEC_ARCH-20260612-05_gestion_clientes_crud_detalle_entidades_relacionadas.md
 *
 * Helpers de UI para subir logos al Brand Kit de un cliente.
 * Encapsula la logica de:
 *  1) Subir el archivo binario a Supabase Storage (bucket "brand-kits",
 *     carpeta "{tenantId}/{clientId}/").
 *  2) Persistir la URL publica resultante en el campo jsonb
 *     `clients.brand_kit.logos` via REST PATCH.
 *
 * Esta capa es deliberadamente "pura" (sin acceso a NextRequest/NextResponse)
 * para que pueda ejercitarse desde tests con mocks de fetch.
 */
import { resolveTenantIdBySlug } from "./tenant";
import {
  getClientById as getClientByIdAssets,
  updateClientBrandKit,
  type BrandKit,
  type BrandKitLogo
} from "./assets";

// Re-export para que la UI y los server actions no necesiten importar
// directamente de "./assets".
export type { BrandKit, BrandKitLogo } from "./assets";

export const BRAND_KIT_BUCKET = "brand-kits";

export const BRAND_KIT_LOGO_ALLOWED_PREFIXES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp", "image/gif"];

export const BRAND_KIT_LOGO_MAX_BYTES = 5 * 1024 * 1024; // 5MB

export class BrandKitLogoError extends Error {
  code:
    | "supabase_no_configured"
    | "tenant_not_found"
    | "client_not_found"
    | "file_missing"
    | "file_too_large"
    | "invalid_mime"
    | "storage_upload_error"
    | "postgrest_error"
    | "invalid_filename";
  constructor(code: BrandKitLogoError["code"], message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export type UploadBrandKitLogoInput = {
  tenantSlug?: string;
  clientId: string;
  file: {
    name: string;
    type: string;
    size: number;
    arrayBuffer: () => Promise<ArrayBuffer>;
  };
  nombre?: string;
};

export type UploadBrandKitLogoResult = {
  logo: BrandKitLogo;
  brand_kit: BrandKit;
};

function getServerApiKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
}

function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

function getDefaultTenant(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_TENANT || "vectoria";
}

function getPublicBaseUrl(): string {
  return `${getSupabaseUrl()}/storage/v1/object/public/${BRAND_KIT_BUCKET}/`;
}

function safeFileBase(name: string): string {
  const noExt = name.replace(/\.[^/.]+$/, "");
  const cleaned = noExt.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
  return cleaned || "logo";
}

function getExtension(name: string, mime: string): string {
  if (name.includes(".")) {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext) return ext;
  }
  if (mime.startsWith("image/")) return mime.split("/").pop() ?? "bin";
  return "bin";
}

/**
 * Sube un logo al Brand Kit del cliente y persiste la URL en `clients.brand_kit.logos`.
 *
 * Flujo:
 *  1) Resolver tenantId por slug (default tenant si no se pasa).
 *  2) Validar MIME y tamano.
 *  3) Subir binario a Supabase Storage (upsert) en `{tenantId}/{clientId}/{filename}`.
 *  4) Calcular URL publica.
 *  5) Leer brand_kit actual, agregar (o reemplazar por nombre) el logo y PATCH.
 */
export async function uploadBrandKitLogo(
  input: UploadBrandKitLogoInput
): Promise<UploadBrandKitLogoResult> {
  if (!getSupabaseUrl() || !getServerApiKey()) {
    throw new BrandKitLogoError("supabase_no_configured");
  }

  // Validaciones de input ANTES de tocar la red (fail fast, sin side effects)
  if (!input.clientId) {
    throw new BrandKitLogoError("client_not_found");
  }
  if (!input.file) {
    throw new BrandKitLogoError("file_missing");
  }
  if (input.file.size <= 0) {
    throw new BrandKitLogoError("file_missing");
  }
  if (input.file.size > BRAND_KIT_LOGO_MAX_BYTES) {
    throw new BrandKitLogoError("file_too_large");
  }
  if (!BRAND_KIT_LOGO_ALLOWED_PREFIXES.includes(input.file.type)) {
    throw new BrandKitLogoError("invalid_mime");
  }

  const tenantSlug = input.tenantSlug ?? getDefaultTenant();
  const tenantId = await resolveTenantIdBySlug(tenantSlug);
  if (!tenantId) {
    throw new BrandKitLogoError("tenant_not_found");
  }

  // Verificar que el cliente existe
  const client = await getClientByIdAssets(tenantId, input.clientId);
  if (!client) {
    throw new BrandKitLogoError("client_not_found");
  }

  // 2) Subir binario a Storage
  const ext = getExtension(input.file.name, input.file.type);
  const base = safeFileBase(input.file.name);
  const filename = `${Date.now()}-${base}.${ext}`;
  const storagePath = `${tenantId}/${input.clientId}/${filename}`;

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const uploadRes = await fetch(
    `${getSupabaseUrl()}/storage/v1/object/${BRAND_KIT_BUCKET}/${storagePath}`,
    {
      method: "POST",
      headers: {
        apikey: getServerApiKey(),
        Authorization: `Bearer ${getServerApiKey()}`,
        "Content-Type": input.file.type,
        "x-upsert": "true"
      },
      body: buffer,
      cache: "no-store"
    }
  );

  if (!uploadRes.ok) {
    const detail = await uploadRes.text().catch(() => "");
    throw new BrandKitLogoError(
      "storage_upload_error",
      `storage_upload_error:${uploadRes.status}${detail ? `:${detail}` : ""}`
    );
  }

  const publicUrl = `${getPublicBaseUrl()}${storagePath}`;
  const logo: BrandKitLogo = {
    nombre: (input.nombre?.trim() || "Principal"),
    storage_path: storagePath,
    url: publicUrl
  };

  // 3) Persistir en clients.brand_kit.logos
  const current = (client.brand_kit ?? emptyBrandKit()) as BrandKit;
  const existingLogos = Array.isArray(current.logos) ? current.logos : [];
  // Reemplaza cualquier logo con el mismo nombre; sino lo agrega al final.
  const filtered = existingLogos.filter((l) => l.nombre !== logo.nombre);
  const nextLogos = [...filtered, logo];

  const nextBrandKit: BrandKit = {
    ...current,
    logos: nextLogos
  };

  await updateClientBrandKit(tenantId, input.clientId, nextBrandKit);

  return { logo, brand_kit: nextBrandKit };
}

export function emptyBrandKit(): BrandKit {
  return {
    logos: [],
    colores: [],
    tipografias: [],
    estilo_visual: "",
    tono_marca: [],
    carpeta_compartida: null,
    notas: null
  };
}
