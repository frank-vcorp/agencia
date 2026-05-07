/**
 * IMPL-20260506-49
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-49_evidencia_miniatura_dimensiones.md
 *
 * Componente cliente para renderizar la evidencia de una propuesta con vista
 * enriquecida: miniatura y dimensiones en píxeles para imágenes; degradación
 * honesta (nombre, KB, botón descarga) para PDFs, videos y otros tipos.
 *
 * Principio: no toca schema ni storage — lee naturalWidth/naturalHeight en onLoad.
 */
"use client";

import { useState } from "react";

// Subconjunto mínimo del contrato ProposalEvidence que necesita este componente.
interface EvidenceInfo {
  fileName: string;
  mimeType: string;
  fileSizeBytes: number | null;
  signedUrl: string | null;
}

interface Props {
  evidence: EvidenceInfo;
  /** Variante de color para el ring/pill (principal vs alternativa). */
  variant?: "primary" | "secondary";
}

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function mimeIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.startsWith("video/")) return "🎬";
  return "📎";
}

export function EvidencePreview({ evidence, variant = "primary" }: Props) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);

  const isPrimary = variant === "primary";
  const pillClass = isPrimary
    ? "rounded-[10px] bg-white/70 px-2.5 py-1.5 text-[11px] ring-1 ring-[color:rgba(200,93,39,0.15)]"
    : "rounded-[10px] bg-slate-50 px-2.5 py-1.5 text-[11px] ring-1 ring-[color:var(--line)]";
  const btnClass = isPrimary
    ? "rounded-[12px] bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-700"
    : "rounded-[12px] bg-slate-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-700";

  const sizeKb =
    evidence.fileSizeBytes != null
      ? `${Math.round(evidence.fileSizeBytes / 1024)} KB`
      : null;

  return (
    <div className="mt-2 space-y-2">
      {/* Miniatura: solo para imágenes con URL firmada disponible */}
      {isImageMime(evidence.mimeType) && evidence.signedUrl && (
        <div className="overflow-hidden rounded-[14px] bg-white/60 ring-1 ring-[color:var(--line)] inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={evidence.signedUrl}
            alt={evidence.fileName}
            className="block max-h-48 max-w-full object-contain"
            onLoad={(e) => {
              const img = e.currentTarget;
              setDims({ w: img.naturalWidth, h: img.naturalHeight });
            }}
          />
        </div>
      )}

      {/* Dimensiones en píxeles (aparecen tras onLoad) */}
      {dims && (
        <p className="text-[11px] tabular-nums text-[color:var(--muted)]">
          {dims.w} × {dims.h} px
        </p>
      )}

      {/* Pill nombre + KB y acción abrir/descargar */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={pillClass}>
          {mimeIcon(evidence.mimeType)} {evidence.fileName}
          {sizeKb && (
            <span className="ml-1 text-[color:var(--muted)]">({sizeKb})</span>
          )}
        </span>
        {evidence.signedUrl ? (
          <a
            href={evidence.signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={btnClass}
          >
            Abrir / Descargar
          </a>
        ) : (
          <span className="text-[11px] text-amber-700">
            Archivo subido — URL firmada no disponible temporalmente
          </span>
        )}
      </div>
    </div>
  );
}
