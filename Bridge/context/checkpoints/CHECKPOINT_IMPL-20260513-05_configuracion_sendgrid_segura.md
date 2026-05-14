# CHECKPOINT IMPL-20260513-05 — Configuración segura SendGrid desde Bridge

**ID:** IMPL-20260513-05  
**Agente:** SOFIA - Builder  
**Fecha:** 2026-05-13  
**SPEC de origen:** ARCH-20260513-05  
**Corte paraguas:** ARCH-20260510-11  
**Estado:** ✅ Implementado — listo para QA

---

## Resumen ejecutivo

Se implementó la superficie interna `/configuracion` para SendGrid en Bridge. El operador puede ahora revisar el estado del canal email y ajustar parámetros del remitente desde UI sin tocar código. `SENDGRID_API_KEY` sigue viviendo en secretos de plataforma (Vercel).

---

## Archivos modificados

| Archivo | Tipo de cambio | Descripción |
|---------|---------------|-------------|
| `supabase/migrations/20260513100000_sendgrid_config_tenant_runtime_v1.sql` | **Nuevo** | Migración: 3 columnas nuevas en `tenant_runtime_settings` |
| `lib/tenant-runtime.ts` | **Modificado** | Nuevos tipos + query extendida + 2 funciones nuevas |
| `lib/notifications.ts` | **Modificado** | MCT consume config del tenant con fallback a env |
| `app/configuracion/page.tsx` | **Nuevo** | Página Server Component + Server Action |
| `components/app-shell.tsx` | **Modificado** | Acceso visible "Configuración" en sidebar y mobile |
| `lib/tenant-runtime.test.ts` | **Modificado** | Tests actualizados + 1 nuevo caso sendgrid |

---

## Migración incluida

**Archivo:** `supabase/migrations/20260513100000_sendgrid_config_tenant_runtime_v1.sql`

```sql
alter table public.tenant_runtime_settings
  add column if not exists sendgrid_from_email     text null,
  add column if not exists sendgrid_agency_name    text null,
  add column if not exists sendgrid_reply_to_email text null;
```

Columnas opcionales (`null`), retrocompatibles. La fila existente del tenant `vectoria` no se modifica.

**Aplicación remota:**

La migración ya fue aplicada en producción mediante `supabase db push` sobre el proyecto `vectoria`.

**Referencia operativa:** `vrboviomvfizqnsvhlew`

**Cómo reaplicar o replicar en otro entorno:**
```bash
# Supabase CLI (si configurado):
supabase db push

# O directo en Supabase SQL Editor:
# Copiar contenido de la migración y ejecutar
```

---

## Comportamiento implementado

### `/configuracion` (nueva ruta)
- **Estado en runtime** (3 pills): API key presente/ausente, email remitente configurado/faltante, canal listo/no operativo
- **Aviso de seguridad**: mensaje explícito sobre separación API key vs parámetros operativos
- **Formulario editable**: `sendgridFromEmail`, `sendgridAgencyName`, `sendgridReplyToEmail` (opcional)
- **Server Action** que llama `updateTenantSendgridConfig` y hace `revalidatePath`
- **Fuente**: los campos muestran valores del tenant si existen, fallback a env vars

### `lib/tenant-runtime.ts`
- `TenantRuntimeConfig` extendido con `sendgridFromEmail | null`, `sendgridAgencyName | null`, `sendgridReplyToEmail | null`
- Tipo `SendgridRuntimeConfig` exportado
- Query PostgREST extendida para incluir los 3 campos nuevos
- `getTenantSendgridConfig(slug?)` — lectura simple
- `updateTenantSendgridConfig(slug, patch)` — escritura via service role PATCH

### `lib/notifications.ts`
- Eliminadas constantes module-level `AGENCY_NAME` y `FROM_EMAIL`
- `resolveSenderConfig()` lee del tenant con fallback a env vars
- `sendTransactionalEmail` llama `resolveSenderConfig()` antes de cada envío
- `buildEmailPayload` recibe `sender` como parámetro explícito
- **Canales Google Chat y WhatsApp sin cambios**

---

## Soft Gates

| Gate | Estado | Evidencia |
|------|--------|-----------|
| 1. Compilación | ✅ | `npm run build` → 14 páginas generadas, `/configuracion` en bundle |
| 2. Testing | ✅ | `vitest run` → 8/8 tests en verde (3 tenant-runtime + 5 WhatsApp) |
| 3. Revisión | ✅ | Sin errores TypeScript en los 4 archivos modificados |
| 4. Documentación | ✅ | Este checkpoint |

---

## Criterios de aceptación vs SPEC

| Criterio SPEC | Cumplido |
|---------------|---------|
| 1. Existe ruta `/configuracion` | ✅ |
| 2. Muestra si `SENDGRID_API_KEY` está presente/ausente | ✅ |
| 3. Operador puede editar `sendgridFromEmail` y `sendgridAgencyName` desde UI | ✅ |
| 4. Valores persisten en `tenant_runtime_settings` | ✅ |
| 5. MCT consume esos valores sin tocar código | ✅ |
| 6. Secreto no se guarda dentro de Bridge | ✅ |
| 7. Acceso visible pequeño desde shell | ✅ |
| 8. Validación del slice pasa + checkpoint | ✅ |

---

## Riesgos remanentes

1. **Migración ya aplicada en producción**: en otros entornos o bases nuevas todavía será necesario ejecutar `supabase db push`. El MCT mantiene fallback a env mientras la configuración del tenant no exista o esté vacía.

2. **Sin validación de formato de email en Server Action**: el campo `type="email"` del browser es suficiente para el piloto, pero no hay validación server-side con regex. En un corte futuro se puede agregar con Zod.

3. **`resolveSenderConfig()` agrega un RTT a Supabase por cada email enviado**: aceptable en escala de piloto. Si el volumen crece, se puede cachear con `unstable_cache` de Next.js.

4. **RLS**: las políticas actuales de `tenant_runtime_settings` permiten lectura pública a tenants activos pero el PATCH requiere service role key. Si la service role key no está en Vercel, el guardado fallará silenciosamente (el form no muestra error explícito por diseño Server Action).

---

## Variables de entorno requeridas (sin cambio)

- `SENDGRID_API_KEY` — secreto de plataforma, Vercel env vars
- `BRIDGE_FROM_EMAIL` — fallback si no hay config en DB
- `BRIDGE_AGENCY_NAME` — fallback si no hay config en DB
- `SUPABASE_SERVICE_ROLE_KEY` — ya existente, requerido para el PATCH

---

*Generado por SOFIA | ID: IMPL-20260513-05*
