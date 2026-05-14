# Checkpoint IMPL-20260513-04
**Agente:** SOFIA - Builder  
**Fecha:** 2026-05-13  
**SPEC:** ARCH-20260513-04 — SendGrid como proveedor de email para MCT V1  
**Estado:** ✅ Gates 1 y 2 validados

---

## Resumen de cambios

### Archivos modificados

| Archivo | Tipo de cambio |
|---------|---------------|
| `lib/notifications.ts` | Sustitución de Resend → SendGrid (backend de envío) |
| `lib/notifications.test.ts` | Actualización de mock `resend` → `@sendgrid/mail` |
| `package.json` | Dependencia `resend ^6.12.3` → `@sendgrid/mail ^8.1.4` |
| `package-lock.json` | Actualizado por npm automáticamente |

### Cambios específicos en `lib/notifications.ts`

1. `import { Resend } from "resend"` → `import sgMail from "@sendgrid/mail"`
2. `const resend = new Resend(...)` eliminado (SendGrid usa módulo singleton)
3. Guard de degradación: `RESEND_API_KEY not set` → `SENDGRID_API_KEY not set`
4. `sgMail.setApiKey()` invocado dentro de `sendTransactionalEmail()` cuando la key está presente
5. `resend.emails.send({...})` → `sgMail.send({...})` con desestructuración `[response]`
6. `messageId` extraído de `response.headers["x-message-id"]`
7. Contrato del MCT (`MCTEmailEvent`, `MCTEmailResult`, payloads por evento) **intacto**

---

## Validación de Gates

### Gate 1 — Compilación
- `npx tsc --noEmit` en `lib/notifications.ts`: **sin errores**
- Errores pre-existentes en `asset-detail.test.ts` y `assets.test.ts` son ajenos al slice

### Gate 2 — Testing
- `npm test`: **370/370 tests pasan** (19 suites)
- `lib/notifications.test.ts` (5 tests): ✅ — `buildWhatsAppLink` y contratos validados
- Mock de `@sendgrid/mail` correctamente hoisted

### Gate 3 — Revisión
- Contratos validados: `client.created`, `quotation.active`, `asset.delivered` sin cambio en firma
- `buildWhatsAppLink` y `notifyOperatorGoogleChat` intactos
- Rutas consumidoras (`app/api/v1/clients/route.ts`, `app/api/v1/projects/[id]/quotation/route.ts`) no requieren cambios

### Gate 4 — Documentación
- Variables de entorno documentadas en esta sección

---

## Variables de entorno requeridas

| Variable | Descripción | Obligatoria |
|----------|-------------|-------------|
| `SENDGRID_API_KEY` | API Key de SendGrid para el piloto | ✅ Sí |
| `BRIDGE_FROM_EMAIL` | Remitente (ej: `hola@vectoria.mx`) | ✅ Sí — debe estar verificado en SendGrid |
| `BRIDGE_AGENCY_NAME` | Nombre de la agencia (ej: `Vectoria`) | Opcional, default `Vectoria` |

### Retiradas
- `RESEND_API_KEY` ya no es funcional para el canal email — puede removerse de Vercel y `.env.local`

---

## Riesgos remanentes

1. **Dominio remitente no verificado en SendGrid** — si `BRIDGE_FROM_EMAIL` usa un dominio no autenticado en la cuenta SendGrid, los envíos reales fallarán con 403. Acción: verificar el dominio en SendGrid antes del primer envío real.
2. **`SENDGRID_API_KEY` no agregada a Vercel** — la degradación honesta cubre esto con `success: false`, pero el piloto no enviará emails hasta que se configure la variable en Vercel (producción + preview).
3. **`x-message-id` en headers** — SendGrid devuelve el ID en `response.headers["x-message-id"]`. Si SendGrid cambia la clave del header en futuras versiones, `messageId` quedará `undefined` (no crítico para el contrato).
4. **Vulnerabilidades reportadas por `npm audit`** — 1 moderate, 1 high en dependencias de árbol (no en `@sendgrid/mail` directamente). No bloqueantes para el slice; evaluar con GEMINI en próximo ciclo.

---

## Próximo paso

Invocar CRONISTA para actualizar `PROYECTO.md` con el estado del slice ARCH-20260513-04 como `[✓] Completado`.

Abrir PR para revisión de GEMINI cuando se confirme la configuración de la variable en Vercel.
