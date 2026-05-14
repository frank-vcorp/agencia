# DICTAMEN TECNICO: 500 vacio en POST /api/v1/projects/[id]/quotation
- **ID:** FIX-20260510-16
- **Fecha:** 2026-05-10
- **Solicitante:** SOFIA
- **Estado:** ✅ VALIDADO

### A. Analisis de Causa Raiz
La causa mas probable es que el endpoint intenta escribir en Supabase con una credencial anonima cuando `SUPABASE_SERVICE_ROLE_KEY` no esta presente en el runtime de produccion. El route resuelve la key en [app/api/v1/projects/[id]/quotation/route.ts](app/api/v1/projects/[id]/quotation/route.ts#L55-L76): `getServerKey()` hace fallback a `supabaseEnv.anonKey`, y `pgrest()` lanza una excepcion si PostgREST responde no-ok. La migracion deja ambas tablas con RLS habilitado y politicas de escritura solo para `service_role` en [supabase/migrations/20260506000000_quotations_versionadas_v1.sql](supabase/migrations/20260506000000_quotations_versionadas_v1.sql#L49-L50) y [supabase/migrations/20260506000000_quotations_versionadas_v1.sql](supabase/migrations/20260506000000_quotations_versionadas_v1.sql#L81-L94). Como los POST a `quotations` y `quotation_versions` no estan protegidos por `try/catch` de respuesta de negocio en [app/api/v1/projects/[id]/quotation/route.ts](app/api/v1/projects/[id]/quotation/route.ts#L197-L255), cualquier 401/403/42501 de PostgREST se convierte en excepcion no manejada y Next responde con 500 vacio.

Hipotesis secundaria: el insert contenedor en `quotations` tambien puede fallar si `project.client_id` viene `null`, porque el route envia `client_id: project.client_id` en [app/api/v1/projects/[id]/quotation/route.ts](app/api/v1/projects/[id]/quotation/route.ts#L199-L206), mientras la tabla exige `client_id uuid not null` en [supabase/migrations/20260506000000_quotations_versionadas_v1.sql](supabase/migrations/20260506000000_quotations_versionadas_v1.sql#L3-L10). Eso produciria el mismo 500 vacio por la misma falta de manejo de error, pero requiere que el proyecto en produccion este inconsistente.

Hipotesis terciaria: si ya existe una cotizacion y la insercion en `quotation_versions` choca por constraint o datos invalidos, tambien habria 500 vacio porque ese POST tampoco esta capturado antes de responder. Es menos probable aqui porque ya se elimino el `created_by_agent_id` invalido y el payload actual minimo solo envia campos obligatorios.

Observacion adicional: el PATCH final para activar la version no explica el 500 vacio porque su error si esta absorbido con `.catch(() => null)` en [app/api/v1/projects/[id]/quotation/route.ts](app/api/v1/projects/[id]/quotation/route.ts#L271-L282).

Segunda opinion forense: no fue posible ejecutar Qodo CLI porque el binario no esta disponible en este entorno (`qodo: orden no encontrada`).

### B. Justificacion de la Solucion
El cambio minimo recomendado es eliminar el fallback silencioso a `anonKey` para escrituras server-side y exigir `SUPABASE_SERVICE_ROLE_KEY` en este endpoint. En terminos practicos, `getServerKey()` deberia fallar de forma explicita si la service role key no existe, devolviendo una respuesta controlada de configuracion de servidor en lugar de intentar escribir con la anon key. Ese cambio corrige la causa raiz mas probable y evita 500 vacios tanto en el insert de `quotations` como en el de `quotation_versions`.

Como endurecimiento minimo adicional, conviene capturar el error lanzado por `pgrest()` alrededor de ambos POST y propagar el detalle relevante de PostgREST al log del servidor o a una respuesta JSON controlada. No cambia la logica de negocio, pero vuelve observable cualquier constraint o RLS restante.

### C. Instrucciones de Handoff para SOFIA
1. Verificar en Vercel que `SUPABASE_SERVICE_ROLE_KEY` este definida para Production en el proyecto Bridge/vectoria.
2. Endurecer `getServerKey()` para no caer a `NEXT_PUBLIC_SUPABASE_ANON_KEY` en rutas de escritura.
3. Envolver los POST a `quotations` y `quotation_versions` en manejo de error explicito para registrar el cuerpo `supabase_error:*` antes de responder.
4. Si tras eso persiste un error, revisar el proyecto `60abed85-3e44-4e36-aca4-9b3e9d74928f` para confirmar que `client_id` no sea null.
