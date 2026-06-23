"use client";

/**
 * IMPL-20260613-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-02_brand_kit_cliente_bridge_v1.md
 *            context/SPECs/SPEC_ARCH-20260612-05_gestion_clientes_crud_detalle_entidades_relacionadas.md
 *
 * Componente de UI para subir el logo principal del Brand Kit del cliente.
 *  - Muestra el logo actual (primer logo del array `brand_kit.logos`) con
 *    preview y nombre.
 *  - Boton "Subir logo" + input file (solo operador).
 *  - Maneja estados: idle, subiendo, error, exito (refresca la ruta).
 *  - Usa la server action `uploadClientLogoAction` (que valida el rol de
 *    operador via `getTenantIdentityContext`).
 */
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { uploadClientLogoAction } from "@/app/cliente/[id]/actions";
import type { BrandKit, BrandKitLogo } from "@/lib/assets";

const LOGO_LABELS: Record<string, string> = {
  Principal: "Logo principal",
  Dark: "Logo en negativo",
  Light: "Logo claro",
  Horizontal: "Logo horizontal",
  Vertical: "Logo vertical"
};

function describeLogo(logo: BrandKitLogo): string {
  return LOGO_LABELS[logo.nombre] ?? logo.nombre;
}

export function BrandKitLogoUploader({
  clientId,
  isOperator,
  brandKit
}: {
  clientId: string;
  isOperator: boolean;
  brandKit: BrandKit | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [nombre, setNombre] = useState<string>("Principal");
  const [error, setError] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();
  const logos = brandKit?.logos ?? [];
  const principal = logos[logos.length - 1] ?? null; // el mas reciente vive al final (ver lib/client-brand-kit.ts)

  function openPicker() {
    fileInputRef.current?.click();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite re-subir el mismo archivo
    if (!file) return;
    if (!isOperator) {
      setError("Solo operadores pueden subir logos.");
      return;
    }
    // FIX-20260623-01: guard de tamano en cliente para evitar 413/400 de Vercel.
    // Debe coincidir con BRAND_KIT_LOGO_MAX_BYTES en lib/client-brand-kit.ts.
    if (file.size > 5 * 1024 * 1024) {
      setError("El logo excede el límite de 5 MB. Reduce el tamaño e intenta de nuevo.");
      return;
    }
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("nombre", nombre || "Principal");

    startUpload(async () => {
      const result = await uploadClientLogoAction(clientId, fd);
      if (!result.ok) {
        setError(result.error ?? "Error desconocido");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-[20px] bg-white/80 px-5 py-4 ring-1 ring-[color:var(--line)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Brand Kit · Logo
          </p>
          {principal ? (
            <div className="mt-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={principal.url}
                alt={describeLogo(principal)}
                className="h-14 w-14 rounded-[10px] bg-white object-contain ring-1 ring-[color:var(--line)]"
                data-testid="brand-kit-logo-preview"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" title={describeLogo(principal)}>
                  {describeLogo(principal)}
                </p>
                <p className="truncate text-[10px] text-[color:var(--muted)]" title={principal.storage_path}>
                  {principal.storage_path}
                </p>
                {logos.length > 1 ? (
                  <p className="mt-1 text-[10px] text-[color:var(--muted)]">
                    {logos.length} logos en total
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Sin logo configurado. Sube el primero para empezar.
            </p>
          )}
        </div>

        {isOperator ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex flex-col text-[10px] uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Nombre
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Principal"
                className="mt-1 w-32 rounded-[10px] border border-[color:var(--line)] bg-white px-2 py-1 text-xs font-normal text-slate-700 outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
              />
            </label>
            <button
              type="button"
              onClick={openPicker}
              disabled={isUploading}
              className="inline-flex items-center gap-1 rounded-full bg-[color:var(--accent-deep)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="brand-kit-upload-button"
            >
              {isUploading ? "Subiendo..." : "Subir logo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
              onChange={handleFile}
              className="hidden"
              data-testid="brand-kit-upload-input"
            />
          </div>
        ) : null}
      </div>

      {error ? (
        <p
          className="mt-2 text-xs text-red-600"
          role="alert"
          data-testid="brand-kit-upload-error"
        >
          Error al subir: {error}
        </p>
      ) : null}
    </div>
  );
}
