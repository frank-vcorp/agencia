# SPEC ARCH-20260528-06: Hardening de rehidratacion del brief cliente V1

**ID:** ARCH-20260528-06  
**Agente autor:** INTEGRA - Arquitecto  
**Fecha:** 2026-05-28  
**Estado:** Autorizada — lista para SOFIA  
**Prioridad:** Alta  
**Issue Jira:** SIN-ISSUE  
**Respaldo forense:** `Bridge/context/interconsultas/DICTAMEN_FIX-20260528-01.md`

---

## 1. Objetivo unico y medible

Eliminar el falso negativo `brief_creation_failed` al abrir `/cliente/brief/[projectId]`, manteniendo la creacion automatica del brief pero evitando que el exito dependa de una reconsulta fragil por `projectId`.

## 2. Archivo ancla inicial

1. `Bridge/lib/briefing.ts`

## 3. Datos existentes a reutilizar

1. `getBriefByProjectId(projectId, tenantSlug)` ya resuelve lectura normal para briefs existentes.
2. `createBriefForProject(projectId, tenantSlug)` ya crea `briefs`, `brief_versions`, actualiza estado y agrega mensaje inicial.
3. `getBriefVersionRow`, `resolveBriefOperationalContainer` y `serializeVersion` ya contienen la logica necesaria para rehidratar un `BriefRecord` estable.
4. `app/cliente/brief/[projectId]/page.tsx` ya implementa correctamente el patron leer-o-crear y no debe redisenarse.

## 4. Datos faltantes a crear

1. Una ruta de rehidratacion estable por `briefId` dentro de `Bridge/lib/briefing.ts`.
2. Si hace falta para evitar duplicacion, un helper interno reutilizable que arme `BriefRecord` desde `BriefRow` + tenant.

## 5. Archivos exactos a crear o modificar

1. `Bridge/lib/briefing.ts` — MODIFICAR
2. `Bridge/app/cliente/brief/[projectId]/page.tsx` — MODIFICAR solo si TypeScript o el flujo final lo exige; evitar cambios funcionales
3. `Bridge/lib/briefing.test.ts` — MODIFICAR solo si Sofia logra agregar una prueba acotada sin mockear media app

## 6. Maximo de archivos permitidos

3 archivos. Si el fix exige un cuarto archivo, detenerse y devolver BLOQUEO DE CONTEXTO.

## 7. Cambio exacto esperado

1. `createBriefForProject` no debe usar `getBriefByProjectId(projectId, tenantSlug)` como prueba final de exito.
2. La devolucion final debe basarse en el `briefRow.id` recien creado o en un helper equivalente por identificador estable.
3. El comportamiento para briefs ya existentes debe quedar intacto.
4. No cambiar contratos publicos ni rutas.

## 8. Restricciones de alcance

1. No tocar migraciones, RLS, autenticacion ni configuracion de produccion.
2. No agregar dependencias nuevas.
3. No redisenar la UI del portal cliente.
4. No convertir este slice en limpieza general de `lib/briefing.ts`.

## 9. Validacion minima obligatoria

1. `cd Bridge && npm run build`
2. Si se agrega o ajusta prueba local: `cd Bridge && npm test -- briefing`

## 10. Criterios de aceptacion verificables

1. Abrir `/cliente/brief/[projectId]` para un proyecto sin brief previo ya no dispara `brief_creation_failed`.
2. La primera apertura crea un unico brief y una unica version inicial.
3. La recarga de la misma ruta reutiliza el mismo brief, sin duplicados.
4. `npm run build` termina sin errores.

## 11. Contrato de ejecucion para Sofia

**Archivo ancla inicial:** `Bridge/lib/briefing.ts`

**Datos existentes a reutilizar:**
1. `getBriefByProjectId`
2. `createBriefForProject`
3. `getBriefVersionRow`
4. `resolveBriefOperationalContainer`
5. `serializeVersion`

**Datos faltantes a crear:**
1. Helper interno por `briefId` o rehidratacion inline estable

**Archivos exactos a tocar:**
1. `Bridge/lib/briefing.ts`
2. `Bridge/app/cliente/brief/[projectId]/page.tsx` solo si hace falta
3. `Bridge/lib/briefing.test.ts` solo si aporta cobertura real sin abrir alcance

**Validacion exacta esperada:**
1. `cd Bridge && npm run build`
2. `cd Bridge && npm test -- briefing` solo si hubo cambio en tests

**Condicion de detencion si falta contexto:**
1. Si la rehidratacion estable obliga a tocar mas de 3 archivos, devolver BLOQUEO DE CONTEXTO.
2. Si el fallo real se mueve a `project_not_found`, detenerse y reportar que la hipotesis del falso negativo quedo invalidada.

## 12. Definicion de terminado

Slice terminado cuando `createBriefForProject` devuelve el `BriefRecord` sin depender de read-back por `projectId`, el build pasa y la ruta del cliente deja de caer con `brief_creation_failed`.