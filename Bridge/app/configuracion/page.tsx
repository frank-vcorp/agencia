/**
 * IMPL-20260513-05 | ARCH-20260513-20
 * Respaldo: context/SPECs/SPEC_ARCH-20260513-05_configuracion_sendgrid_segura_v1.md
 *
 * Superficie interna de configuración — parámetros no secretos de SendGrid.
 * SENDGRID_API_KEY NO se almacena aquí; vive en secretos de plataforma.
 * Ajuste: recorte visual para concentrar la UI en estado y acción.
 */
import { revalidatePath } from "next/cache";

import { getTenantSendgridConfig, updateTenantSendgridConfig } from "@/lib/tenant-runtime";
import { supabaseEnv } from "@/lib/supabase";

// ─── Server Action ─────────────────────────────────────────────────────────────

async function guardarConfigSendgrid(formData: FormData): Promise<void> {
  "use server";

  const fromEmail    = (formData.get("sendgridFromEmail") as string | null)?.trim() || null;
  const agencyName   = (formData.get("sendgridAgencyName") as string | null)?.trim() || null;
  const replyToEmail = (formData.get("sendgridReplyToEmail") as string | null)?.trim() || null;

  await updateTenantSendgridConfig(supabaseEnv.defaultTenant, {
    sendgridFromEmail: fromEmail,
    sendgridAgencyName: agencyName,
    sendgridReplyToEmail: replyToEmail || undefined
  });

  revalidatePath("/configuracion");
}

// ─── Helpers de estado ────────────────────────────────────────────────────────

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
        ok
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} />
      {label}
    </span>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function ConfiguracionPage() {
  const cfg             = await getTenantSendgridConfig();
  const apiKeyPresente  = Boolean(process.env.SENDGRID_API_KEY);
  const fromEmailOk     = Boolean(cfg?.sendgridFromEmail || process.env.BRIDGE_FROM_EMAIL);
  const agencyNameOk    = Boolean(cfg?.sendgridAgencyName || process.env.BRIDGE_AGENCY_NAME);
  const canalListo      = apiKeyPresente && fromEmailOk;

  const defaultFrom   = cfg?.sendgridFromEmail   ?? process.env.BRIDGE_FROM_EMAIL    ?? "";
  const defaultAgency = cfg?.sendgridAgencyName  ?? process.env.BRIDGE_AGENCY_NAME   ?? "";
  const defaultReply  = cfg?.sendgridReplyToEmail ?? "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="panel rounded-[28px] px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--muted)]">
          Bridge · Configuración
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
          Canal de email — SendGrid
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
          Revisa el estado del canal y ajusta solo los parámetros que sí afectan el envío.
        </p>
      </div>

      {/* Estado del canal */}
      <div className="panel rounded-[28px] px-6 py-5">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--muted)]">
          Estado en runtime
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-[color:var(--line)]">
            <p className="text-xs text-[color:var(--muted)]">SENDGRID_API_KEY</p>
            <div className="mt-2">
              <StatusPill ok={apiKeyPresente} label={apiKeyPresente ? "Presente" : "Ausente"} />
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[color:var(--muted)]">
              {apiKeyPresente
                ? "Detectada en secretos de plataforma."
                : "Agrégala en Vercel → Settings → Environment Variables como SENDGRID_API_KEY."}
            </p>
          </div>

          <div className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-[color:var(--line)]">
            <p className="text-xs text-[color:var(--muted)]">Email remitente</p>
            <div className="mt-2">
              <StatusPill ok={fromEmailOk} label={fromEmailOk ? "Configurado" : "Faltante"} />
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[color:var(--muted)]">
              {defaultFrom ? `En uso: ${defaultFrom}` : "Sin configurar. Usa el formulario abajo."}
            </p>
          </div>

          <div className="rounded-2xl bg-white/80 px-4 py-3 ring-1 ring-[color:var(--line)]">
            <p className="text-xs text-[color:var(--muted)]">Canal email</p>
            <div className="mt-2">
              <StatusPill ok={canalListo} label={canalListo ? "Listo para enviar" : "No operativo"} />
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[color:var(--muted)]">
              {canalListo
                ? agencyNameOk
                  ? `Remitente: ${defaultAgency}`
                  : "Agency name pendiente de configurar."
                : "Requiere API key + email remitente."}
            </p>
          </div>
        </div>

      </div>

      {/* Formulario de configuración editable */}
      <div className="panel rounded-[28px] px-6 py-5">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--muted)]">
          Parámetros del remitente
        </p>
        <form action={guardarConfigSendgrid} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="sendgridFromEmail" className="block text-xs font-semibold text-slate-700">
                Email remitente
              </label>
              <input
                type="email"
                id="sendgridFromEmail"
                name="sendgridFromEmail"
                defaultValue={cfg?.sendgridFromEmail ?? ""}
                placeholder={process.env.BRIDGE_FROM_EMAIL ?? "hola@vectoria.mx"}
                className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:ring-offset-1"
              />
            </div>

            <div>
              <label htmlFor="sendgridAgencyName" className="block text-xs font-semibold text-slate-700">
                Nombre de la agencia
              </label>
              <input
                type="text"
                id="sendgridAgencyName"
                name="sendgridAgencyName"
                defaultValue={cfg?.sendgridAgencyName ?? ""}
                placeholder={process.env.BRIDGE_AGENCY_NAME ?? "Vectoria"}
                className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:ring-offset-1"
              />
            </div>
          </div>

          <div className="sm:w-1/2">
            <label htmlFor="sendgridReplyToEmail" className="block text-xs font-semibold text-slate-700">
              Reply-to
            </label>
            <input
              type="email"
              id="sendgridReplyToEmail"
              name="sendgridReplyToEmail"
              defaultValue={cfg?.sendgridReplyToEmail ?? ""}
              placeholder="respuestas@vectoria.mx"
              className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent)] focus:ring-offset-1"
            />
          </div>

          <div className="flex items-center gap-4 border-t border-[color:var(--line)] pt-4">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 active:scale-[0.98]"
            >
              Guardar configuración
            </button>
            <p className="text-xs text-[color:var(--muted)]">
              La API key sigue viviendo en secretos de plataforma.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
