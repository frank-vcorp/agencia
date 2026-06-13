"use client";

/**
 * IMPL-ARCH-20260612-05
 * Respaldo: context/SPECs/SPEC_ARCH-20260612-05_gestion_clientes_crud_detalle_entidades_relacionadas.md
 * Formulario de cliente reutilizable para crear y editar. Usa `useFormState`
 * con la server action correspondiente.
 */
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";

import {
  createClientAction,
  updateClientAction,
  type ClientFormState
} from "@/app/clientes/actions";
import {
  CLIENT_STATUSES,
  CLIENT_STATUS_LABELS,
  type ClientStatus
} from "@/lib/clients";

const INITIAL_STATE: ClientFormState = { ok: false, error: null, fieldErrors: {} };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-[color:var(--accent-deep)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Guardando..." : label}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

export function ClientForm({
  mode,
  clientId,
  initial
}: {
  mode: "create" | "edit";
  clientId?: string;
  initial?: {
    name: string;
    legalName: string | null;
    status: ClientStatus;
    primaryContactName: string | null;
    primaryContactEmail: string | null;
    primaryContactWhatsapp: string | null;
    primaryContactChannel: string | null;
    notes: string | null;
  };
}) {
  const action =
    mode === "create"
      ? createClientAction
      : updateClientAction.bind(null, clientId ?? "");

  const [state, formAction] = useFormState(action, INITIAL_STATE);

  return (
    <form action={formAction} className="space-y-5">
      {state.error && !Object.keys(state.fieldErrors).length ? (
        <div className="rounded-[14px] bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-2 block font-medium">Nombre del cliente *</span>
          <input
            name="name"
            type="text"
            required
            defaultValue={initial?.name ?? ""}
            className="w-full rounded-[18px] border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
            placeholder="Ej. Acme Corp"
          />
          <FieldError message={state.fieldErrors.name} />
        </label>

        <label className="block text-sm">
          <span className="mb-2 block font-medium">Razón social</span>
          <input
            name="legalName"
            type="text"
            defaultValue={initial?.legalName ?? ""}
            className="w-full rounded-[18px] border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
            placeholder="(Opcional)"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-2 block font-medium">Estado</span>
          <select
            name="status"
            defaultValue={initial?.status ?? "active"}
            className="w-full rounded-[18px] border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
          >
            {CLIENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CLIENT_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <FieldError message={state.fieldErrors.status} />
        </label>

        <label className="block text-sm">
          <span className="mb-2 block font-medium">Contacto principal</span>
          <input
            name="primaryContactName"
            type="text"
            defaultValue={initial?.primaryContactName ?? ""}
            className="w-full rounded-[18px] border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
            placeholder="Nombre de la persona de contacto"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-2 block font-medium">Email de contacto</span>
          <input
            name="primaryContactEmail"
            type="email"
            defaultValue={initial?.primaryContactEmail ?? ""}
            className="w-full rounded-[18px] border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
            placeholder="contacto@cliente.com"
          />
          <FieldError message={state.fieldErrors.primaryContactEmail} />
        </label>

        <label className="block text-sm">
          <span className="mb-2 block font-medium">WhatsApp de contacto</span>
          <input
            name="primaryContactWhatsapp"
            type="tel"
            defaultValue={initial?.primaryContactWhatsapp ?? ""}
            className="w-full rounded-[18px] border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
            placeholder="+52 55 1234 5678"
          />
        </label>

        <label className="block text-sm md:col-span-2">
          <span className="mb-2 block font-medium">Canal preferido</span>
          <input
            name="primaryContactChannel"
            type="text"
            defaultValue={initial?.primaryContactChannel ?? ""}
            className="w-full rounded-[18px] border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
            placeholder="Ej. WhatsApp, email, llamada, etc."
          />
        </label>

        <label className="block text-sm md:col-span-2">
          <span className="mb-2 block font-medium">Notas internas</span>
          <textarea
            name="notes"
            rows={4}
            defaultValue={initial?.notes ?? ""}
            className="w-full rounded-[18px] border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[color:var(--accent-deep)]"
            placeholder="Información adicional sobre el cliente..."
          />
        </label>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Link
          href={mode === "edit" && clientId ? `/cliente/${clientId}` : "/clientes"}
          className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-[color:var(--line)] transition hover:bg-slate-50"
        >
          Cancelar
        </Link>
        <SubmitButton label={mode === "create" ? "Crear cliente" : "Guardar cambios"} />
      </div>
    </form>
  );
}
