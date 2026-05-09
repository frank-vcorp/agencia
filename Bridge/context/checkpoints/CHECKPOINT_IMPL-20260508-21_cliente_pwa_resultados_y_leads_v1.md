# CHECKPOINT IMPL-20260508-21 — Cliente PWA: Resultados y Leads V1

**Fecha:** 2026-05-08  
**Agente:** SOFIA - Builder  
**ID:** IMPL-20260508-21  
**SPEC de referencia:** `context/SPECs/SPEC_ARCH-20260508-21_cliente_pwa_resultados_y_leads_v1.md`

---

## Resumen Ejecutivo

Se implementó el corte completo de `/cliente` como PWA ligera con 5 bloques: `queSigue`, `estadoDelProyecto`, `revisiones`, `resultadosPorCanal` y `leadsYSeguimiento`. El módulo reutiliza señales existentes de briefs, cotizaciones, activos y CRM sin inventar una verdad paralela ni exponer el pipeline interno del equipo.

---

## Soft Gates

| Gate | Estado | Evidencia |
|------|--------|-----------|
| 1 — Compilación | ✅ Pasa | `npm run build` exitoso, `/cliente` en 2.4 kB first load |
| 2 — Testing | ✅ Pasa | 304/304 tests, 18 tests nuevos en `client-portal.test.ts` |
| 3 — Revisión | ⏳ Pendiente | Requiere revisión humana / QA |
| 4 — Documentación | ✅ Checkpoint generado | Este documento |

---

## Archivos Tocados

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `lib/client-portal.ts` | Creado | Capa de datos: tipos, funciones puras, fetch Supabase |
| `lib/client-portal.test.ts` | Creado | 18 tests para funciones puras (deriveBriefStages, deriveNextClientAction, deriveChannelStatus, leadStatusToClientLabel) |
| `components/client-portal.tsx` | Creado | Vista con los 5 bloques: QueSigue, EstadoDelProyecto, Revisiones, ResultadosPorCanal, LeadsYSeguimiento |
| `app/cliente/layout.tsx` | Creado | Layout PWA con metadata de manifest, appleWebApp, viewport mobile-first |
| `app/cliente/page.tsx` | Modificado | Reemplazado launcher por `async` page que consume `getClientPortal()` |
| `public/manifest.webmanifest` | Creado | Manifest PWA instalable: nombre, icono, start_url=/cliente, theme_color |

---

## Decisiones Tomadas

### 1. Google Ads sin canal en CRM
El CRM V1 (`LEAD_SOURCE_CHANNELS`) no incluye `google_ads` como canal de lead. La señal de Google Ads se deriva exclusivamente de `assets` con `application_code='google'`. El `contactCount` de Google Ads es siempre 0 en V1. **Esto es deliberado** — la nota visible al cliente indica piezas en producción, no contactos directos.

### 2. Etiquetas de leads derivadas del status
El tipo `Lead` no tiene campo `tags` ni `etiquetas`. V1 deriva la etiqueta del `status` interno traducido al lenguaje del cliente (ej. `en_seguimiento` → `"En seguimiento"`). No se exponen notas internas, scoring ni comentarios operativos.

### 3. Review items son display-only en V1
Los botones de Aprobar / Rechazar / Pedir ajustes son visibles pero no persisten. El copy debajo indica al cliente que contacte a su ejecutivo. La mutación real requeriría una tabla `client_review_decisions` — fuera de alcance de este corte per SPEC.

### 4. AppShell envuelve /cliente
El `RootLayout` usa el `AppShell` global con navegación completa de Bridge (Operador / Diseñador / Cliente / módulos). El `app/cliente/layout.tsx` agrega `max-w-xl mx-auto` pero no puede reemplazar el AppShell. El cliente ve la barra lateral de Bridge completa — esto es una inconsistencia entre la experiencia "PWA standalone" y la realidad de V1.

### 5. Fetch paralelo de señales
`getClientPortal()` ejecuta en paralelo: brief más reciente, cotizaciones enviadas, todos los activos, activos en revisión y leads recientes. Dos fetches secundarios (proyecto y cliente) son secuenciales porque dependen del `project_id` del brief.

---

## Criterios de Aceptación — Estado

| Criterio | Estado | Nota |
|----------|--------|------|
| `/cliente` puede instalarse como PWA | ✅ | Manifest + metadata appleWebApp + viewport |
| Portada responde rápido qué sigue | ✅ | Bloque `QueSigueBlock` al tope |
| Brief se muestra en 3 momentos con lenguaje simple | ✅ | `deriveBriefStages()` mapea status interno a 3 etapas en español |
| Cliente puede ver Aprobar / Rechazar / Pedir cambios | ✅ (display) | Botones visibles, display-only en V1 |
| Resultados limitados a Facebook, Google Ads y WhatsApp | ✅ | `channelResultsSummary` con exactamente esos 3 canales |
| Lectura por canal, sin atribución avanzada | ✅ | Nota visible en el bloque |
| Leads muestran: canal, nombre, asunto, etiquetas, fecha | ✅ | `ClientLeadSummary` con esos 5 campos exactamente |
| Sin notas internas, scoring ni pipeline completo | ✅ | `getRecentLeads()` no selecciona esos campos |
| Lenguaje sin jerga interna | ✅ | Labels en español simple para cliente |

---

## Inconsistencias a Revisar

### 🔴 Inconsistencia Principal: AppShell visible en /cliente
**Problema:** El cliente que accione el manifest e instale la PWA verá el AppShell de Bridge con navegación a Operador y Diseñador. Esto rompe la separación de roles.  
**Opciones:**
- **A)** Crear `app/(client-pwa)/cliente/layout.tsx` con su propio `<html>/<body>` y sin AppShell (requiere route group).
- **B)** Agregar lógica en AppShell para ocultar la sidebar cuando `pathname.startsWith('/cliente')`.
- **Recomendación:** Opción B es más rápida para P0; Opción A es más limpia para producción.

### 🟡 Google Ads sin señal de CRM
No hay canal `google_ads` en el CRM V1. Los contactos de Google Ads siempre muestran 0. Debería resolverse en SPEC de integración de canales externos.

### 🟡 Acciones de revisión sin persistencia
Los botones de aprobación no persisten. Se requiere una tabla `client_review_decisions` y un endpoint de mutación para el siguiente corte.

### 🟡 Sesión del cliente no autenticada
La SPEC menciona "sesión persistente" pero no hay auth de cliente en V1. El portal lee el tenant por defecto, no por sesión de cliente individual. Se requiere SPEC de autenticación de portal cliente.

---

## Relación con Operador y Diseñador

| Aspecto | Operador | Diseñador | Cliente |
|---------|----------|-----------|---------|
| Data layer | `lib/operator-radar.ts` | `lib/designer-workspace.ts` | `lib/client-portal.ts` |
| View component | `components/operator-radar.tsx` | `components/designer-workspace.tsx` | `components/client-portal.tsx` |
| Page | `app/operador/page.tsx` | `app/disenador/page.tsx` | `app/cliente/page.tsx` |
| Layout propio | No | No | Sí (`layout.tsx` con PWA) |
| Auth | No (V1) | No (V1) | No (V1) |
| Supabase pattern | `postgrest()` | `postgrest()` | `postgrest()` ✅ consistente |

---

## Próximos Pasos Sugeridos

1. **INTEGRA:** Decidir entre opción A o B para aislar AppShell de /cliente.
2. **INTEGRA:** SPEC de autenticación de portal cliente (sesión por tenant/cliente).
3. **INTEGRA:** SPEC de `client_review_decisions` para persistir aprobaciones.
4. **INTEGRA:** SPEC de integración Google Ads si se quiere señal real de contactos.
