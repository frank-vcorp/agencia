/**
 * IMPL-20260510-09
 * Módulo de Comunicación Transaccional (MCT) V1
 * Respaldo: context/SPECs/SPEC_ARCH-20260510-09_modulo_comunicacion_transaccional_mct_v1.md
 *
 * Canales:
 *  - Email automático al cliente (Resend)
 *  - Google Chat automático al operador (Incoming Webhook)
 *  - WhatsApp Click-to-Send (generación de URL wa.me)
 */

import { Resend } from "resend";
import { render } from "@react-email/render";

import { ClientCreatedEmail } from "../emails/client-created";
import { QuotationActiveEmail } from "../emails/quotation-active";
import { AssetDeliveredEmail } from "../emails/asset-delivered";

// ─── Constantes ───────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY);

const AGENCY_NAME = process.env.BRIDGE_AGENCY_NAME ?? "Vectoria";
const FROM_EMAIL = process.env.BRIDGE_FROM_EMAIL ?? "hola@vectoria.mx";

// ─── Tipos de dominio ─────────────────────────────────────────────────────────

export type MCTEmailEvent = "client.created" | "quotation.active" | "asset.delivered";

export type ClientCreatedData = {
  to: string;
  clientName: string;
  portalUrl: string;
  magicLink: string;
  projectName: string;
};

export type QuotationActiveData = {
  to: string;
  clientName: string;
  projectName: string;
  quotationSummary: string;
  total: number;
  currency: string;
  portalUrl: string;
  expiresAt: string;
};

export type AssetDeliveredData = {
  to: string;
  clientName: string;
  assetName: string;
  portalUrl: string;
  isProjectComplete: boolean;
};

export type MCTEmailEventDataMap = {
  "client.created": ClientCreatedData;
  "quotation.active": QuotationActiveData;
  "asset.delivered": AssetDeliveredData;
};

export type MCTEmailResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};

// ─── Helpers de validación ────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Canal 1: Email automático al cliente (Resend) ────────────────────────────

/**
 * Envía un email transaccional al cliente según el evento.
 * Usa degradación silenciosa: si faltan env vars o el email no es válido,
 * registra un warning y retorna { success: false } sin lanzar excepción.
 */
export async function sendTransactionalEmail<E extends MCTEmailEvent>(
  event: E,
  data: MCTEmailEventDataMap[E]
): Promise<MCTEmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[MCT] RESEND_API_KEY no configurada, email omitido.", { event });
    return { success: false, error: "RESEND_API_KEY not set" };
  }

  const to = (data as { to: string }).to;

  if (!to || !isValidEmail(to)) {
    console.warn("[MCT] Email de destinatario inválido o vacío, email omitido.", {
      event,
      to: to ? "[email inválido]" : "[vacío]"
    });
    return { success: false, error: "invalid_recipient_email" };
  }

  try {
    const { subject, html } = await buildEmailPayload(event, data);

    const result = await resend.emails.send({
      from: `${AGENCY_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html
    });

    if (result.error) {
      console.error("[MCT] Error al enviar email.", { event, to: "[email]", error: result.error });
      return { success: false, error: result.error.message };
    }

    console.info("[MCT] Email enviado.", { event, to: "[email]", messageId: result.data?.id });
    return { success: true, messageId: result.data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    console.error("[MCT] Excepción al enviar email.", { event, error: message });
    return { success: false, error: message };
  }
}

// ─── Builder interno de payload ───────────────────────────────────────────────

async function buildEmailPayload(
  event: MCTEmailEvent,
  data: MCTEmailEventDataMap[MCTEmailEvent]
): Promise<{ subject: string; html: string }> {
  switch (event) {
    case "client.created": {
      const d = data as ClientCreatedData;
      const subject = `Tu espacio en ${AGENCY_NAME} ya está listo`;
      const html = await render(
        ClientCreatedEmail({ ...d, agencyName: AGENCY_NAME })
      );
      return { subject, html };
    }
    case "quotation.active": {
      const d = data as QuotationActiveData;
      const subject = `Tu propuesta de ${AGENCY_NAME} ya está disponible`;
      const html = await render(
        QuotationActiveEmail({ ...d, agencyName: AGENCY_NAME })
      );
      return { subject, html };
    }
    case "asset.delivered": {
      const d = data as AssetDeliveredData;
      const subject = `Tu entrega está lista — ${d.assetName}`;
      const html = await render(
        AssetDeliveredEmail({ ...d, agencyName: AGENCY_NAME })
      );
      return { subject, html };
    }
  }
}

// ─── Canal 2: Google Chat al operador ─────────────────────────────────────────

export type BriefCompletedData = {
  event: "brief.completed";
  clientName: string;
  projectName: string;
  briefSummary: string;
  operatorUrl: string;
};

/**
 * Notifica al operador vía Google Chat Incoming Webhook.
 * Degradación silenciosa si GOOGLE_CHAT_WEBHOOK_URL no está configurado.
 */
export async function notifyOperatorGoogleChat(data: BriefCompletedData): Promise<void> {
  if (!process.env.GOOGLE_CHAT_WEBHOOK_URL) {
    console.warn("[MCT] GOOGLE_CHAT_WEBHOOK_URL no configurada, notificación omitida.", {
      event: data.event
    });
    return;
  }

  const text = [
    `✅ *${data.clientName}* completó su brief`,
    `📁 Proyecto: ${data.projectName}`,
    `📝 ${data.briefSummary}`,
    `🔗 <${data.operatorUrl}|Ver en Bridge>`
  ].join("\n");

  try {
    await fetch(process.env.GOOGLE_CHAT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    console.info("[MCT] Notificación Google Chat enviada.", { event: data.event });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    console.error("[MCT] Error al notificar Google Chat.", { event: data.event, error: message });
  }
}

// ─── Canal 3: WhatsApp Click-to-Send ─────────────────────────────────────────

/**
 * Genera un enlace wa.me con el mensaje prellenado.
 * phone: formato internacional sin + ni espacios, ej: "521234567890"
 * El operador hace clic → WhatsApp Web abre la conversación → presiona Enviar.
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
}
