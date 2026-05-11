# SPEC ARCH-20260510-09: Módulo de Comunicación Transaccional (MCT) V1

**ID:** ARCH-20260510-09
**Agente autor:** INTEGRA - Arquitecto
**Fecha:** 2026-05-10
**Estado:** Autorizada — lista para SOFIA
**Prioridad:** Alta — bloquea el flujo operativo real del cliente en 3 momentos críticos
**Puntaje de prioridad:** (Valor 9 × 3) + (Urgencia 8 × 2) - (Complejidad 4 × 0.5) = 41

---

## 1. Contexto y Motivación

El flujo operativo de Bridge tiene 3 momentos donde el sistema debe comunicarse automáticamente sin intervención humana:

1. **Alta de cliente** — El cliente necesita recibir sus credenciales y la URL de su portal.
2. **Cotización lista** — El cliente debe recibir la propuesta para revisarla y aprobarla.
3. **Activo entregado** — El cliente debe recibir su entrega final con enlace de descarga.

Sin este módulo, Frank debe enviar estos mensajes manualmente por fuera de Bridge, rompiendo la trazabilidad y convirtiendo el sistema en una herramienta incompleta.

Adicionalmente, Bridge debe notificar al operador (Frank) cuando el cliente completa el brief conversacional, para que el agente de VS Code pueda proceder con la propuesta.

---

## 2. Objetivo

Implementar un módulo de comunicación transaccional (MCT) V1 con tres canales:

1. **Email automático al cliente** (Resend) — en alta, cotización y entrega.
2. **Google Chat automático al operador** (Incoming Webhook) — cuando el cliente completa el brief.
3. **WhatsApp Click-to-Send para el cliente** — Bridge genera el enlace `wa.me` con el mensaje prellenado; Frank lo envía con un clic desde WhatsApp Web.

---

## 3. Alcance de esta SPEC

### Incluye

1. Servicio `lib/notifications.ts` con 3 funciones: `sendTransactionalEmail`, `notifyOperatorGoogleChat`, `buildWhatsAppLink`.
2. 4 plantillas de email reactivas con React Email.
3. Función `buildWhatsAppLink(phone, message)` que genera URL `wa.me` codificada correctamente.
4. Botón "Enviar por WhatsApp" en la UI de Bridge para los 3 momentos clave del cliente.
5. Integración con Google Chat Incoming Webhook para notificación al operador.
6. Variables de entorno: `RESEND_API_KEY`, `GOOGLE_CHAT_WEBHOOK_URL`, `BRIDGE_OPERATOR_EMAIL`.
7. Tests unitarios con mock de Resend y mock de `fetch` para Google Chat.

### Excluye

- WhatsApp Business API / Twilio (requiere aprobación de Meta — V2).
- SMS.
- Notificaciones en tiempo real dentro de Bridge (eso es SPEC separada de WebSockets).
- Sistema de plantillas dinámicas administrables desde UI.
- Historial de comunicaciones en la cabina (V2).

---

## 4. Los 4 Eventos y sus Disparadores

### Evento A — Cliente creado (`client.created`)

**Cuándo:** Al crear un cliente nuevo desde Bridge (vía UI o vía agente MCP).  
**Destinatario:** Email del contacto principal del cliente.  
**Asunto:** `Tu espacio en [Nombre Agencia] ya está listo`  
**Contenido:**
- Nombre del cliente
- URL de su portal: `https://[dominio]/portal/[tenant-slug]`
- Magic link temporal (48h) para primer acceso sin contraseña
- Nombre del proyecto asignado

**Canal WhatsApp (click-to-send):**  
Junto al botón "Cliente creado" en la cabina del operador, Bridge muestra un botón "Enviar por WhatsApp" que abre:
```
https://wa.me/[telefono-cliente]?text=Hola%20[Nombre]%2C%20tu%20espacio%20en%20[Agencia]%20ya%20est%C3%A1%20listo...
```
Frank hace clic → WhatsApp Web abre la conversación con el mensaje prellenado → Frank presiona Enviar.

**Disparador en código:**
```typescript
// En el handler POST /api/clients o createClient() Server Action
await sendTransactionalEmail('client.created', {
  to: client.contactEmail,
  clientName: client.name,
  portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${tenant.slug}`,
  magicLink: await generateMagicLink(client.contactEmail, tenant.slug),
  projectName: project.name,
})

// El enlace wa.me se genera en el componente UI, no en el servidor
const waLink = buildWhatsAppLink(client.contactPhone, `Hola ${client.name}, tu espacio...`)
```

---

### Evento B — Brief completado (`brief.completed`)

**Cuándo:** El cliente completa el brief conversacional en su portal (marca el brief como listo).  
**Destinatario:** Frank (operador) — via Google Chat Incoming Webhook.  
**Mensaje en Google Chat:**
```
✅ *[Nombre cliente]* completó su brief
📁 Proyecto: [Nombre proyecto]
📝 Resumen: [3 líneas del brief]
🔗 [Ver proyecto en Bridge](https://bridge.app/operador/projects/[id])
```

**Disparador en código:**
```typescript
// En la acción que cambia el estado del brief a 'completed'
await notifyOperatorGoogleChat({
  event: 'brief.completed',
  clientName: client.name,
  projectName: project.name,
  briefSummary: brief.summary,
  operatorUrl: `${process.env.NEXT_PUBLIC_APP_URL}/operador/projects/${project.id}`,
})
```

---

### Evento C — Cotización vigente (`quotation.active`)

**Cuándo:** El operador cambia el estado de una cotización a `vigente` desde Bridge o desde el agente MCP.  
**Destinatario:** Email del contacto principal del cliente.  
**Asunto:** `Tu propuesta de [Nombre Agencia] ya está disponible`  
**Contenido:**
- Nombre del cliente y proyecto
- Resumen de la propuesta (servicios, total)
- URL del portal donde pueden ver y aprobar la cotización
- Fecha de vencimiento de la cotización

**Canal WhatsApp (click-to-send):**  
Bridge muestra botón "Enviar por WhatsApp" junto al estado "vigente" de la cotización:
```
https://wa.me/[telefono]?text=Hola%20[Nombre]%2C%20tu%20propuesta%20ya%20est%C3%A1%20disponible...
```

**Disparador en código:**
```typescript
// En el handler que actualiza estado de cotización a 'vigente'
await sendTransactionalEmail('quotation.active', {
  to: client.contactEmail,
  clientName: client.name,
  projectName: project.name,
  quotationSummary: quotation.summaryText,
  total: quotation.totalAmount,
  currency: quotation.currency,
  portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${tenant.slug}/cotizaciones`,
  expiresAt: quotation.validUntil,
})

// Enlace wa.me en el componente UI de la cotización
const waLink = buildWhatsAppLink(client.contactPhone, `Hola ${client.name}, tu propuesta...`)
```

---

### Evento D — Activo entregado (`asset.delivered`)

**Cuándo:** El operador aprueba un activo y su estado cambia a `delivered`.  
**Destinatario:** Email del contacto principal del cliente.  
**Asunto:** `Tu entrega está lista — [Nombre del activo]`  
**Contenido:**
- Nombre del activo entregado
- Enlace al portal para descarga
- Mensaje de cierre del proyecto (si todos los activos están entregados)

**Canal WhatsApp (click-to-send):**  
Bridge muestra botón "Notificar por WhatsApp" junto al activo aprobado:
```
https://wa.me/[telefono]?text=Hola%20[Nombre]%2C%20tu%20entrega%20[activo]%20ya%20est%C3%A1%20lista...
```

**Disparador en código:**
```typescript
// En el handler que aprueba el activo
await sendTransactionalEmail('asset.delivered', {
  to: client.contactEmail,
  clientName: client.name,
  assetName: asset.name,
  portalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${tenant.slug}/entregas`,
  isProjectComplete: allAssetsDelivered,
})

// Enlace wa.me en el componente UI del activo
const waLink = buildWhatsAppLink(client.contactPhone, `Hola ${client.name}, tu entrega...`)
```

---

## 5. Arquitectura del Módulo

### 5.1 Estructura de archivos

```
Bridge/
├── lib/
│   └── notifications.ts              ← Servicio central MCT (email + Google Chat + wa.me)
├── emails/
│   ├── client-created.tsx            ← Plantilla React Email
│   ├── quotation-active.tsx          ← Plantilla React Email
│   └── asset-delivered.tsx           ← Plantilla React Email
└── __tests__/
    └── notifications.test.ts         ← Tests con mock de Resend y fetch
```

> Nota: El evento `brief.completed` no tiene plantilla de email — solo usa Google Chat.

### 5.2 Servicio `lib/notifications.ts`

```typescript
// lib/notifications.ts
import { Resend } from 'resend'
import { render } from '@react-email/render'

const resend = new Resend(process.env.RESEND_API_KEY)

// --- EMAIL AL CLIENTE ---
export type MCTEmailEvent = 'client.created' | 'quotation.active' | 'asset.delivered'

export async function sendTransactionalEmail<E extends MCTEmailEvent>(
  event: E,
  data: MCTEmailEventDataMap[E]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[MCT] RESEND_API_KEY no configurada, email omitido.')
    return { success: false, error: 'RESEND_API_KEY not set' }
  }
  // Selecciona plantilla y asunto por evento, renderiza y envía
}

// --- GOOGLE CHAT AL OPERADOR ---
export async function notifyOperatorGoogleChat(data: {
  event: 'brief.completed'
  clientName: string
  projectName: string
  briefSummary: string
  operatorUrl: string
}): Promise<void> {
  if (!process.env.GOOGLE_CHAT_WEBHOOK_URL) {
    console.warn('[MCT] GOOGLE_CHAT_WEBHOOK_URL no configurada, notificación omitida.')
    return
  }
  const text = [
    `✅ *${data.clientName}* completó su brief`,
    `📁 Proyecto: ${data.projectName}`,
    `📝 ${data.briefSummary}`,
    `🔗 <${data.operatorUrl}|Ver en Bridge>`,
  ].join('\n')
  
  await fetch(process.env.GOOGLE_CHAT_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
}

// --- WHATSAPP CLICK-TO-SEND (solo genera URL, no envía automáticamente) ---
export function buildWhatsAppLink(phone: string, message: string): string {
  // phone: formato internacional sin + ni espacios, ej: "521234567890"
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${phone}?text=${encoded}`
}
```

### 5.3 Variables de entorno requeridas

```bash
# .env.local
RESEND_API_KEY=re_xxxxxxxxxxxx
BRIDGE_FROM_EMAIL=hola@vectoria.mx              # Email verificado en Resend
BRIDGE_AGENCY_NAME=Vectoria                     # Nombre de la agencia en plantillas
GOOGLE_CHAT_WEBHOOK_URL=https://chat.googleapis.com/v1/spaces/XXXXX/messages?key=...&token=...
```

> `BRIDGE_OPERATOR_EMAIL` ya no es necesario — la notificación al operador va por Google Chat.

---

## 6. Dependencias a instalar

```bash
npm install resend @react-email/render @react-email/components
```

**Versiones recomendadas:**
- `resend`: ^3.x
- `@react-email/render`: ^1.x
- `@react-email/components`: ^0.0.x

> Google Chat no requiere dependencia — es un `fetch` nativo a la URL del webhook.
> WhatsApp Click-to-Send no requiere dependencia — es generación de URL con `encodeURIComponent`.

---

## 7. Criterios de Aceptación

| # | Criterio | Canal | Verificación |
|---|----------|-------|--------------|
| CA-1 | Al crear un cliente, el contacto recibe email con URL del portal y magic link | Email | Log de Resend |
| CA-2 | Al crear un cliente, Bridge muestra botón "Enviar por WhatsApp" con mensaje prellenado | WhatsApp | Verificar URL `wa.me` generada |
| CA-3 | Al completar el brief, llega mensaje a Google Chat del operador con resumen y enlace | Google Chat | Verificar en el espacio configurado |
| CA-4 | Al activar cotización, el cliente recibe email con resumen y enlace al portal | Email | Log de Resend |
| CA-5 | Al activar cotización, Bridge muestra botón "Enviar por WhatsApp" con mensaje prellenado | WhatsApp | Verificar URL `wa.me` generada |
| CA-6 | Al aprobar activo, el cliente recibe email con enlace de descarga | Email | Log de Resend |
| CA-7 | Al aprobar activo, Bridge muestra botón "Notificar por WhatsApp" con mensaje prellenado | WhatsApp | Verificar URL `wa.me` generada |
| CA-8 | Si `RESEND_API_KEY` no está, el sistema no rompe — log de warning y continúa | — | Remover env var → verificar flujo |
| CA-9 | Si `GOOGLE_CHAT_WEBHOOK_URL` no está, el sistema no rompe — log de warning | — | Remover env var → verificar flujo |
| CA-10 | Los emails son responsivos y muestran correctamente en mobile | Email | Resend preview |
| CA-11 | Tests unitarios pasan con `vi.mock('resend')` y `vi.mock('node-fetch')` | — | `npm run test` verde |
| CA-12 | El nombre de la agencia en plantillas se toma de `BRIDGE_AGENCY_NAME` | Email | Verificar en preview |

---

## 8. Consideraciones de Seguridad

1. **Magic link**: Usar tokens de un solo uso con expiración de 48 horas. Almacenar hash en Supabase, no el token en claro.
2. **Rate limiting**: No enviar más de 1 email por evento por cliente en 1 hora (prevenir doble-disparo si se activa el handler dos veces).
3. **PII**: No loggear el contenido del email. Solo loggear `{ event, to: '[email]', messageId }`.
4. **Validación**: Verificar que el email del destinatario tenga formato válido antes de llamar a Resend.

---

## 9. Orden de Implementación para SOFIA

1. Instalar dependencias (`resend`, `@react-email/render`, `@react-email/components`).
2. Crear `lib/notifications.ts` con las 3 funciones: `sendTransactionalEmail`, `notifyOperatorGoogleChat`, `buildWhatsAppLink`.
3. Crear las 3 plantillas React Email en `emails/` (client-created, quotation-active, asset-delivered).
4. Integrar `sendTransactionalEmail('client.created', ...)` en el handler de creación de clientes.
5. Agregar botón WhatsApp (Click-to-Send) en el componente de cliente recien creado en la cabina.
6. Integrar `notifyOperatorGoogleChat(...)` en la acción de completar brief.
7. Integrar `sendTransactionalEmail('quotation.active', ...)` en el handler de activar cotización.
8. Agregar botón WhatsApp (Click-to-Send) en el componente de cotización.
9. Integrar `sendTransactionalEmail('asset.delivered', ...)` en el handler de aprobar activo.
10. Agregar botón WhatsApp (Click-to-Send) en el componente del activo aprobado.
11. Escribir tests con `vi.mock('resend')` y mock de `fetch` global para Google Chat.
12. Agregar las variables de entorno a `.env.example` (sin valores reales) y documentar en README.
13. Verificar que `npm run build && npm run test` pasa verde.

---

## 10. Notas para V2

- WhatsApp Business API vía Twilio (envío automático sin intervención del operador).
- Historial de comunicaciones visible en la cabina del operador.
- Plantillas administrables desde UI (sin código).
- Preferencias de canal por cliente (email vs WhatsApp).
- Canal Slack como alternativa a Google Chat para el operador.
