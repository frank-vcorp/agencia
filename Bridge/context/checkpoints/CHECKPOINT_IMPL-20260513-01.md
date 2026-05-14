# CHECKPOINT IMPL-20260513-01
**Agente:** SOFIA - Builder  
**Fecha:** 2026-05-13  
**ID de Intervención:** IMPL-20260513-01  
**SPEC de respaldo:** context/SPECs/SPEC_ARCH-20260513-01_contacto_cliente_estructurado_email_whatsapp_v1.md  
**Corte paraguas:** ARCH-20260510-11  

---

## Resumen

Cierre del modelo de contacto estructurado del cliente con `primary_contact_email` y `primary_contact_whatsapp`. El MCT queda desbloqueado para usar email real del cliente en flujos operativos posteriores.

---

## Archivos Cambiados

| Archivo | Tipo de cambio |
|---------|----------------|
| `supabase/migrations/20260513000000_clients_contact_email_whatsapp_v1.sql` | **NUEVO** — migración SQL con 2 columnas nullable |
| `lib/assets.ts` | Agregados `isValidEmail()`, `sanitizeWhatsapp()`, campos en `CreateClientInput`, campos en INSERT de `createClient()` |
| `app/api/v1/clients/route.ts` | Validación de email, extracción y propagación de `primaryContactEmail` y `primaryContactWhatsapp` |
| `mcp/src/bridge-client.ts` | `ClientCreateInput` ampliado con los 2 campos nuevos |
| `mcp/src/tools/create-client.ts` | Schema JSON del tool y handler actualizado con los 2 campos nuevos |
| `lib/briefing.ts` | `BriefClientContainer`, `ClientRow` interno y `normalizeClientRow` con los 2 campos nuevos |
| `lib/assets.test.ts` | 10 tests nuevos para `isValidEmail` y `sanitizeWhatsapp` |

---

## Validación

### Gate 1 — Compilación ✓
- `npm run build` (Next.js): **limpio**, sin errores TS
- `npm run build` (MCP `mcp/`): **limpio**, sin errores TS

### Gate 2 — Testing ✓
- Suite completo: **356 tests pasando, 0 fallos**
- Tests nuevos del slice: 10 tests en `assets.test.ts` (`isValidEmail` × 5, `sanitizeWhatsapp` × 5)

### Gate 3 — Revisión ✓
- Cambios mínimos y consistentes con el estilo existente
- No se abrieron frentes fuera del slice
- `primary_contact_channel` conservado como campo legado complementario
- Columnas nullable → clientes existentes no se rompen

### Gate 4 — Documentación ✓
- Marca de agua `IMPL-20260513-01` en todos los archivos modificados con comentario JSDoc
- Migración con comentario de respaldo

---

## Criterios de Aceptación (SPEC §7) — Estado

| # | Criterio | Estado |
|---|----------|--------|
| 1 | `clients` tiene `primary_contact_email` y `primary_contact_whatsapp` | ✓ migración 20260513... |
| 2 | Crear cliente por API acepta y persiste ambos campos | ✓ route.ts actualizado |
| 3 | Crear cliente por MCP acepta y persiste ambos campos | ✓ bridge-client + create-client.ts |
| 4 | Clientes previos no se rompen | ✓ columnas nullable |
| 5 | Capa de dominio expone ambos campos tipados | ✓ `CreateClientInput` + `BriefClientContainer` |
| 6 | `primary_contact_channel` permanece como campo opcional | ✓ no eliminado |
| 7 | Validación mínima de email y limpieza de WhatsApp | ✓ `isValidEmail()` + `sanitizeWhatsapp()` |
| 8 | Slice cubierto por tests | ✓ 10 tests nuevos |

---

## Riesgos Remanentes

1. **Migración no aplicada en producción** — el SQL está listo pero hay que ejecutarlo en Supabase (vía dashboard o `supabase db push`). Hasta que no se aplique, los INSERTs de los campos nuevos fallarán silenciosamente con 400/500.
2. **Normalización internacional WhatsApp** — `sanitizeWhatsapp` es básico: elimina no-dígitos y preserva `+` inicial. No valida longitud mínima ni prefijo de país. Aceptable para V1 piloto; se puede endurecer en slice posterior.
3. **Lectura del email en MCT** — `sendTransactionalEmail()` en `lib/notifications.ts` todavía toma el destinatario de forma manual. El nuevo campo `primary_contact_email` lo deja disponible pero el MCT aún necesita un slice de integración para leerlo automáticamente.

---

## Próximo Paso Recomendado

1. Aplicar la migración en Supabase producción.
2. Solicitar a GEMINI auditoría del PR.
3. Continuar con siguiente slice del corte ARCH-20260510-11 (PDF o disparadores MCT reales).
