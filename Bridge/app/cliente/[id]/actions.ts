"use server";

/**
 * IMPL-20260613-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-02_brand_kit_cliente_bridge_v1.md
 *            context/SPECs/SPEC_ARCH-20260612-05_gestion_clientes_crud_detalle_entidades_relacionadas.md
 *
 * Server actions del detalle del cliente (/cliente/[id]).
 * Reutilizan las funciones de `lib/client-brand-kit.ts` y verifican que el
 * actor sea un operador del tenant.
 */
import { revalidatePath } from "next/cache";

import {
  uploadBrandKitLogo,
  BrandKitLogoError,
  type BrandKit,
  type BrandKitLogo
} from "@/lib/client-brand-kit";
import { getTenantIdentityContext } from "@/lib/identity";

export type UploadBrandKitLogoResult = {
  ok: boolean;
  error: string | null;
  logo: BrandKitLogo | null;
  brand_kit: BrandKit | null;
};

function denyActor(): UploadBrandKitLogoResult {
  return { ok: false, error: "forbidden", logo: null, brand_kit: null };
}

/**
 * Sube un logo al Brand Kit del cliente (Storage + persistencia en
 * clients.brand_kit.logos). Solo operadores del tenant pueden ejecutarlo.
 */
export async function uploadClientLogoAction(
  clientId: string,
  formData: FormData
): Promise<UploadBrandKitLogoResult> {
  if (!clientId) {
    return { ok: false, error: "client_id_required", logo: null, brand_kit: null };
  }

  const identity = await getTenantIdentityContext();
  if (!identity?.operatorMembership) {
    return denyActor();
  }

  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File) || fileEntry.size === 0) {
    return { ok: false, error: "file_required", logo: null, brand_kit: null };
  }
  const nombre = String(formData.get("nombre") ?? "Principal").trim() || "Principal";

  try {
    const result = await uploadBrandKitLogo({
      clientId,
      file: {
        name: fileEntry.name,
        type: fileEntry.type,
        size: fileEntry.size,
        arrayBuffer: () => fileEntry.arrayBuffer()
      },
      nombre
    });

    revalidatePath(`/cliente/${clientId}`);

    return { ok: true, error: null, logo: result.logo, brand_kit: result.brand_kit };
  } catch (err) {
    if (err instanceof BrandKitLogoError) {
      return { ok: false, error: err.code, logo: null, brand_kit: null };
    }
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg, logo: null, brand_kit: null };
  }
}
