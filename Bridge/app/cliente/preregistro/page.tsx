/**
 * IMPL-20260610-04
 * Página de pre-registro para vendedores.
 * Formulario para capturar cliente y generar link WhatsApp.
 */
"use client";
import { useState } from "react";

export default function PreregistroPage() {
  const [form, setForm] = useState({
    clientName: "",
    clientPhone: "",
    businessName: ""
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ projectId: string; whatsappUrl: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/v1/preregistro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "Error al crear pre-registro");
        return;
      }

      setResult({ projectId: data.projectId, whatsappUrl: data.whatsappUrl });
      setForm({ clientName: "", clientPhone: "", businessName: "" });
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (result?.whatsappUrl) {
      await navigator.clipboard.writeText(result.whatsappUrl);
    }
  };

  return (
    <section className="panel rounded-[28px] px-6 py-8 max-w-2xl mx-auto">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--muted)]">
        Pre-registro de cliente
      </p>
      <h1 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight text-[color:var(--foreground)]">
        Captura rápida de prospecto
      </h1>

      {result ? (
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <p className="text-sm font-medium text-green-800 mb-2">
            Cliente creado exitosamente
          </p>
          <p className="text-xs text-green-700 mb-3">
            Proyecto: {result.projectId.slice(0, 8)}...
          </p>
          <a
            href={result.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            Abrir WhatsApp
          </a>
          <button
            onClick={copyToClipboard}
            className="ml-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-300"
          >
            Copiar link
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Nombre del cliente
            </label>
            <input
              type="text"
              required
              value={form.clientName}
              onChange={e => setForm({ ...form, clientName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Ej: Juan Pérez"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              WhatsApp (10 dígitos)
            </label>
            <input
              type="tel"
              required
              pattern="[0-9]{10}"
              value={form.clientPhone}
              onChange={e => setForm({ ...form, clientPhone: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Ej: 4423207082"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Nombre del negocio
            </label>
            <input
              type="text"
              required
              value={form.businessName}
              onChange={e => setForm({ ...form, businessName: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              placeholder="Ej: Taller Rodamax"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-[color:var(--accent)] text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Creando..." : "Crear pre-registro"}
          </button>
        </form>
      )}
    </section>
  );
}