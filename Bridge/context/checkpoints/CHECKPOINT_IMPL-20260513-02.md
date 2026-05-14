# Checkpoint IMPL-20260513-02 — Integración MCT con Eventos Reales V1

**ID:** IMPL-20260513-02
**Agente:** SOFIA - Builder
**Fecha:** 2026-05-13
**SPEC fuente:** SPEC_ARCH-20260513-02_integracion_mct_eventos_reales_v1.md
**Slice autorizado:** ARCH-20260513-02 (depende de ARCH-20260513-01)
**Estado:** ✅ Entregado — listo para QA

---

## 1. Resumen de Cambios

### Archivos modificados (5)

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `lib/assets.ts` | Mejora | `isValidEmail` — TLD mínimo 2 chars (observación GEM) |
| `lib/assets.test.ts` | Test | Caso nuevo: rechaza TLD de 1 char |
| `lib/notifications.test.ts` | Test nuevo | 5 tests para `buildWhatsAppLink` (función pura) |
| `app/api/v1/clients/route.ts` | Integración | Dispara `client.created` + retorna `emailSent` + `whatsAppLink` |
| `app/api/v1/projects/[id]/quotation/route.ts` | Integración | Dispara `quotation.active` + retorna `emailSent` real + `whatsAppLink` |

---

## 2. Criterios de Aceptación Verificados

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Crear cliente con email válido puede disparar `client.created` | ✅ | POST /api/v1/clients llama `sendTransactionalEmail` si `primaryContactEmail` existe |
| Crear cliente sin email no rompe el flujo | ✅ | Degradación silenciosa, `emailSent: false` |
| Activar cotización con cliente que tiene email dispara `quotation.active` | ✅ | POST /api/v1/projects/[id]/quotation con `setAsActive=true` consulta cliente y dispara |
| `emailSent` refleja resultado real del envío | ✅ | `result.success` del MCT propaga al contrato de respuesta |
| `whatsAppLink` utilizable si hay `primary_contact_whatsapp` | ✅ | `buildWhatsAppLink(sanitizeWhatsapp(phone), msg)` en ambos endpoints |
| No se introducen magic links ni portal fake | ✅ | V1 honesto: `magicLink = portalUrl = BRIDGE_PORTAL_URL \|\| vectoria.mx` |
| Degradación honesta si faltan env vars o contacto | ✅ | MCT ya guarda con `console.warn/info`, sin lanzar excepción |
| Tests del slice validados | ✅ | 362/362 tests pass, 0 regresiones |

---

## 3. Validación Ejecutada (Gates 1–2)

### Gate 1 — Compilación
```
npx tsc --noEmit
```
Resultado: 2 errores **preexistentes** (no introducidos por este slice), sin errores nuevos.

### Gate 2 — Testing
```
npx vitest run
Test Files  18 passed (18)
Tests       362 passed (362)
```
Incluye nueva suite `lib/notifications.test.ts` (5 tests de `buildWhatsAppLink`).

---

## 4. Diseño de la Integración

### `POST /api/v1/clients` (client.created)

```
[POST /api/v1/clients]
  → createClient()  ← ya persiste primaryContactEmail + primaryContactWhatsapp
  → si primaryContactEmail:
      sendTransactionalEmail("client.created", { to, clientName, portalUrl, magicLink: portalUrl, projectName: "(proyecto en preparación)" })
      emailSent = result.success
  → si rawWhatsapp:
      whatsAppLink = buildWhatsAppLink(sanitizeWhatsapp(rawWhatsapp), mensaje bienvenida)
  → return { ok, clientId, name, status, emailSent, whatsAppLink? }
```

### `POST /api/v1/projects/[id]/quotation` con setAsActive=true (quotation.active)

```
[POST con setAsActive=true]
  → PATCH quotations (active_version_id, status: sent)
  → si project.client_id:
      GET clients (id, name, primary_contact_name, primary_contact_email, primary_contact_whatsapp)
      si primary_contact_email:
          sendTransactionalEmail("quotation.active", { to, clientName, projectName, total, currency, portalUrl, expiresAt })
          emailSent = result.success
      si primary_contact_whatsapp:
          whatsAppLink = buildWhatsAppLink(phone, mensaje con total)
  → return { ok, quotationId, version, status, totalAmount, currency, emailSent, whatsAppLink? }
```

---

## 5. Observaciones GEM Incorporadas

1. **Sanitización consistente de WhatsApp**: En `clients/route.ts`, se llama explícitamente `sanitizeWhatsapp(rawWhatsapp)` antes de `buildWhatsAppLink`, garantizando el mismo pipeline que el almacenamiento en DB. En `quotation/route.ts`, el número ya viene sanitizado de la DB (vía `createClient`).

2. **Validación de email más robusta**: `isValidEmail` ahora exige TLD mínimo de 2 chars (`{2,}` en lugar de `+`), rechazando dominios como `user@domain.c`.

---

## 6. Riesgos Remanentes

| Riesgo | Severidad | Acción recomendada |
|--------|-----------|-------------------|
| Plantilla `client-created.tsx` incluye texto hardcoded "válido por 48 horas" que no aplica sin magic link real | Baja | Actualizar plantilla cuando exista magic link; por ahora el CTA apunta a `portalUrl` real |
| `projectName: "(proyecto en preparación)"` en `client.created` es placeholder | Baja | Aceptable para V1; se resolverá cuando flujo cliente tenga proyecto asociado en alta |
| `BRIDGE_PORTAL_URL` no configurado en Vercel → usa `https://vectoria.mx` como fallback | Media | Agregar la variable al entorno de Vercel en próximo deploy |
| No hay evento `asset.delivered` integrado | Ninguna | Excluido explícitamente de este slice por SPEC |
| `sendTransactionalEmail` en ruta HTTP (modo edge no soportado) | Baja | Ambas rutas ya usan `export const dynamic = "force-dynamic"` — OK para Node.js runtime |

---

## 7. Soft Gates

- [✅] **Gate 1 — Compilación**: `tsc --noEmit` sin errores nuevos
- [✅] **Gate 2 — Testing**: 362/362 tests, 18 suites
- [⏳] **Gate 3 — Revisión**: Pendiente revisión GEMINI / CodeRabbit en PR
- [⏳] **Gate 4 — Documentación**: Este checkpoint documenta el slice

---

*IMPL-20260513-02 · SOFIA - Builder · 2026-05-13*
