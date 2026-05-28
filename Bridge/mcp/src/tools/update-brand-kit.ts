/**
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-02_brand_kit_cliente_bridge_v1.md
 */
import type {
  BridgeClient,
  BrandKit,
  BrandKitColor,
  BrandKitTipografia,
  BrandKitLogo
} from "../bridge-client.js";

type UpdateBrandKitArgs = {
  client_id: string | null;
  logos?: BrandKitLogo[];
  colores?: BrandKitColor[];
  tipografias?: BrandKitTipografia[];
  estilo_visual?: string;
  tono_marca?: string[];
  carpeta_compartida?: string;
  notas?: string;
};

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter((item): item is string => typeof item === "string");
  return strings.length === value.length ? strings : undefined;
}

function parseArgs(args: unknown): UpdateBrandKitArgs {
  if (!args || typeof args !== "object") {
    return { client_id: null };
  }

  return {
    client_id:
      "client_id" in args && typeof args.client_id === "string"
        ? args.client_id
        : null,
    logos: "logos" in args && Array.isArray(args.logos) ? (args.logos as BrandKitLogo[]) : undefined,
    colores: "colores" in args && Array.isArray(args.colores) ? (args.colores as BrandKitColor[]) : undefined,
    tipografias:
      "tipografias" in args && Array.isArray(args.tipografias)
        ? (args.tipografias as BrandKitTipografia[])
        : undefined,
    estilo_visual:
      "estilo_visual" in args && typeof args.estilo_visual === "string"
        ? args.estilo_visual
        : undefined,
    tono_marca: "tono_marca" in args ? asStringArray(args.tono_marca) : undefined,
    carpeta_compartida:
      "carpeta_compartida" in args && typeof args.carpeta_compartida === "string"
        ? args.carpeta_compartida
        : undefined,
    notas: "notas" in args && typeof args.notas === "string" ? args.notas : undefined
  };
}

export const updateBrandKitToolDefinition = {
  name: "bridge_update_brand_kit",
  description: "Actualiza metadatos del brand kit de un cliente sin perder logos existentes.",
  inputSchema: {
    type: "object" as const,
    properties: {
      client_id: { type: "string", description: "UUID del cliente" },
      logos: { type: "array", items: { type: "object" } },
      colores: { type: "array", items: { type: "object" } },
      tipografias: { type: "array", items: { type: "object" } },
      estilo_visual: { type: "string" },
      tono_marca: { type: "array", items: { type: "string" } },
      carpeta_compartida: { type: "string" },
      notas: { type: "string" }
    },
    required: ["client_id"]
  }
};

export async function handleUpdateBrandKit(client: BridgeClient, args: unknown): Promise<string> {
  const {
    client_id,
    logos,
    colores,
    tipografias,
    estilo_visual,
    tono_marca,
    carpeta_compartida,
    notas
  } = parseArgs(args);

  if (!client_id) return "Error: client_id es requerido.";

  try {
    const current = await client.getBrandKit(client_id);
    const base: BrandKit = current ?? {
      logos: [],
      colores: [],
      tipografias: [],
      estilo_visual: "",
      tono_marca: [],
      carpeta_compartida: null,
      notas: null
    };

    const merged: BrandKit = {
      logos: logos ?? base.logos,
      colores: colores ?? base.colores,
      tipografias: tipografias ?? base.tipografias,
      estilo_visual: estilo_visual ?? base.estilo_visual,
      tono_marca: tono_marca ?? base.tono_marca,
      carpeta_compartida: carpeta_compartida ?? base.carpeta_compartida,
      notas: notas ?? base.notas
    };

    await client.updateBrandKit(client_id, merged);
    return JSON.stringify({ ok: true, message: "Brand kit actualizado." }, null, 2);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return `Error al actualizar brand kit: ${msg}`;
  }
}
