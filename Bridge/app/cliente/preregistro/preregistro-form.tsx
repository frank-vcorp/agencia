/**
 * IMPL-20260613-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260610-05_preregistro_cliente_vendedor.md
 *
 * Formulario client component que usa la server action `submitPreregistroAction`
 * vía `useActionState` de React 19. Muestra feedback de éxito (link de
 * WhatsApp) o error inline.
 */
"use client";

import { useActionState } from "react";
import {
  submitPreregistroAction,
  type PreregistroActionState,
  type PreregistroSuccessState
} from "./actions";

const initialState: PreregistroActionState = { status: "idle" };

export function PreregistroForm() {
  const [state, formAction, pending] = useActionState(
    submitPreregistroAction,
    initialState
  );

  if (state.status === "success") {
    return <PreregistroSuccess result={state} />;
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="clientName" className="block text-sm font-medium mb-1">
          Nombre del cliente
        </label>
        <input
          id="clientName"
          name="clientName"
          type="text"
          required
          minLength={2}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder="Ej: Juan Pérez"
        />
      </div>

      <div>
        <label htmlFor="clientPhone" className="block text-sm font-medium mb-1">
          WhatsApp (10 dígitos)
        </label>
        <input
          id="clientPhone"
          name="clientPhone"
          type="tel"
          required
          pattern="[0-9]{10}"
          inputMode="numeric"
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder="Ej: 4423207082"
        />
      </div>

      <div>
        <label htmlFor="businessName" className="block text-sm font-medium mb-1">
          Nombre del negocio
        </label>
        <input
          id="businessName"
          name="businessName"
          type="text"
          required
          minLength={2}
          className="w-full px-3 py-2 border rounded-lg text-sm"
          placeholder="Ej: Taller Rodamax"
        />
      </div>

      {state.status === "error" && (
        <p
          role="alert"
          className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full px-4 py-2 bg-[color:var(--accent)] text-white rounded-lg text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Creando..." : "Crear pre-registro"}
      </button>
    </form>
  );
}

function PreregistroSuccess({ result }: { result: PreregistroSuccessState }) {
  const copyToClipboard = async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(result.whatsappUrl);
    }
  };

  return (
    <div
      role="status"
      className="p-4 bg-green-50 border border-green-200 rounded-lg"
    >
      <p className="text-sm font-medium text-green-800 mb-1">
        Cliente creado exitosamente
      </p>
      <p className="text-xs text-green-700 mb-3">
        Proyecto: {result.projectId.slice(0, 8)}...
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={result.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
        >
          Abrir WhatsApp
        </a>
        <button
          type="button"
          onClick={copyToClipboard}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300"
        >
          Copiar link
        </button>
      </div>
    </div>
  );
}
