# SPEC ARCH-20260513-05: Configuración Segura de SendGrid desde Bridge V1

**ID:** ARCH-20260513-05  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-13  
**Estado:** Implementada — cierre documentado en CHECKPOINT_IMPL-20260513-05_configuracion_sendgrid_segura.md  
**Prioridad:** Alta  
**Puntaje de prioridad:** (Valor 8 × 3) + (Urgencia 8 × 2) - (Complejidad 5 × 0.5) = 37.5  
**Depende de:** ARCH-20260513-04, ARCH-20260510-11

---

## 1. Contexto

Bridge ya migró el MCT a SendGrid y el piloto ya no depende de Resend. Sin embargo, la configuración actual sigue dependiendo de variables de entorno leídas directamente por código, especialmente:

1. `SENDGRID_API_KEY`,
2. `BRIDGE_FROM_EMAIL`,
3. `BRIDGE_AGENCY_NAME`.

El usuario pidió explícitamente un acceso en configuración para SendGrid, con el objetivo de no volver a tocar código para ajustes operativos.

Hay una restricción importante: **`SENDGRID_API_KEY` es un secreto**. Guardarlo dentro de Bridge sin un diseño explícito de cifrado, permisos y rotación abriría un frente de seguridad innecesario.

Por eso, este slice adopta una decisión segura por defecto:

1. Bridge sí tendrá una superficie `/configuracion` para SendGrid,
2. Bridge sí permitirá configurar parámetros no secretos desde UI,
3. `SENDGRID_API_KEY` seguirá viviendo fuera de la app, en secretos de plataforma,
4. la UI mostrará su estado y guiará al operador sin requerir tocar código.

---

## 2. Objetivo

Agregar una superficie interna de configuración para SendGrid en Bridge, de forma que el operador pueda revisar el estado del canal email y ajustar parámetros operativos desde UI, sin almacenar la API key dentro de la aplicación.

---

## 3. Resultado esperado

Al cerrar este slice:

1. existe una página interna `/configuracion`,
2. esa página muestra el estado del canal SendGrid,
3. el operador puede editar desde UI los parámetros no secretos del remitente,
4. Bridge puede usar esos parámetros en el MCT sin tocar código,
5. la UI deja claro si `SENDGRID_API_KEY` falta en runtime,
6. el secreto sigue fuera de Bridge.

---

## 4. Alcance

### Incluye

1. nueva superficie `/configuracion`,
2. lectura server-side del estado de SendGrid,
3. persistencia en `tenant_runtime_settings` de parámetros no secretos de SendGrid,
4. actualización mínima del MCT para leer esos parámetros desde configuración del tenant cuando existan,
5. formulario simple para editar y guardar configuración no secreta,
6. validación mínima del slice,
7. checkpoint de implementación.

### Excluye

1. almacenamiento de `SENDGRID_API_KEY` dentro de Bridge,
2. cifrado de secretos en DB,
3. integración con Vault/KMS,
4. panel de auditoría de cambios,
5. configuración de otros proveedores además de SendGrid,
6. rediseño amplio del shell de navegación.

---

## 5. Decisiones de diseño

### 5.1 Secreto fuera de la app

`SENDGRID_API_KEY` no debe guardarse en `tenant_runtime_settings` ni en otra tabla de Bridge en este corte.

La UI solo debe:

1. mostrar si la key está presente o ausente en runtime,
2. explicar que vive en secretos de plataforma,
3. permitir operar sin tocar código.

### 5.2 Configuración editable desde UI

Bridge sí puede editar desde UI parámetros no secretos como:

1. `sendgridFromEmail`,
2. `sendgridAgencyName` o alias remitente si se decide separarlo,
3. `sendgridReplyToEmail` si aporta valor inmediato y no infla el slice.

Para mantener el corte estrecho, el mínimo obligatorio es:

1. `sendgridFromEmail`,
2. `sendgridAgencyName`.

### 5.3 Tenant runtime como ancla

La mejor base reutilizable existente es:

1. `tenant_runtime_settings`,
2. `lib/tenant-runtime.ts`.

No debe inventarse una segunda tabla de configuración salvo bloqueo real.

### 5.4 UX honesta

La pantalla debe dejar explícito:

1. qué sí se configura desde Bridge,
2. qué sigue viviendo en secretos de plataforma,
3. si el canal email está listo o no para enviar.

---

## 6. Anclas reales del repo

SOFIA debe concentrar el cambio alrededor de estas rutas:

1. `lib/tenant-runtime.ts`,
2. `supabase/migrations/20260505180500_init_tenants_and_runtime_settings.sql` como referencia estructural,
3. nueva migración puntual sobre `tenant_runtime_settings`,
4. `lib/notifications.ts`,
5. nueva página `app/configuracion/page.tsx` o equivalente,
6. `lib/bridge-data.ts` solo si hace falta un acceso visible y pequeño desde shell.

---

## 7. Modelo de datos esperado

Se espera extender `tenant_runtime_settings` con campos no secretos similares a:

1. `sendgrid_from_email text null`,
2. `sendgrid_agency_name text null`.

Opcional solo si el costo es bajo:

3. `sendgrid_reply_to_email text null`.

No agregar columna para `SENDGRID_API_KEY`.

---

## 8. Comportamiento esperado de `/configuracion`

La página debe mostrar al menos:

1. estado del tenant,
2. estado del canal SendGrid:
   - API key presente / ausente,
   - from email configurado / faltante,
   - agency name configurado / fallback,
3. formulario para editar parámetros no secretos,
4. mensaje claro indicando que la API key vive en secretos de plataforma,
5. acción de guardado con feedback honesto.

Si existe un acceso visible desde shell sin abrir demasiado frente, mejor. Si no, basta con dejar la ruta lista y accesible.

---

## 9. Ajuste esperado en `lib/notifications.ts`

El MCT debe preferir la configuración del tenant cuando exista, con fallback al entorno:

1. `sendgridFromEmail` -> fallback `process.env.BRIDGE_FROM_EMAIL`,
2. `sendgridAgencyName` -> fallback `process.env.BRIDGE_AGENCY_NAME`,
3. `SENDGRID_API_KEY` -> solo runtime/env, sin DB.

La expectativa es mantener el contrato público del MCT estable.

---

## 10. Criterios de aceptación

1. existe una ruta interna `/configuracion` o equivalente clara,
2. la página muestra si `SENDGRID_API_KEY` está presente o ausente,
3. el operador puede editar desde UI al menos `sendgridFromEmail` y `sendgridAgencyName`,
4. esos valores se persisten en `tenant_runtime_settings`,
5. el MCT puede consumir esos valores sin tocar código,
6. el secreto no se guarda dentro de Bridge,
7. la validación del slice pasa,
8. queda checkpoint con variables requeridas y riesgos remanentes.

---

## 11. Riesgos conocidos

1. intentar meter la API key en DB y abrir un frente de seguridad innecesario,
2. abrir una pantalla de configuración demasiado amplia y perder foco,
3. acoplar la UI a secretos en vez de solo a estado/configuración no secreta,
4. cambiar demasiadas rutas del shell cuando basta un acceso mínimo.

---

## 12. Secuencia recomendada para SOFIA

1. extender `tenant_runtime_settings` con los campos no secretos mínimos,
2. actualizar `lib/tenant-runtime.ts` para leer y escribir esos campos,
3. crear `/configuracion` con estado SendGrid + formulario,
4. ajustar `lib/notifications.ts` para usar configuración del tenant con fallback a env,
5. agregar acceso visible pequeño si el costo es bajo,
6. ejecutar validación enfocada,
7. emitir checkpoint.