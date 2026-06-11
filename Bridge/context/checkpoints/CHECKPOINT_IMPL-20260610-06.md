# CHECKPOINT IMPL-20260610-06

**ID:** IMPL-20260610-06
**SPEC de referencia:** ARCH-20260610-05 — Pre-registro cliente vía vendedor
**Fecha:** 2026-06-10
**Agente:** SOFIA - Builder
**Estado de entrega:** LISTO PARA QA (PR pendiente)

---

## Resumen del corte

Cierre del corte de testing del flujo de pre-registro (IMPL-20260610-04). Se
materializó el archivo `lib/preregistro-helpers.ts` que la SPEC ARCH-20260610-05
listaba en su alcance (4 archivos) pero que no había sido creado: las funciones
`normalizePhone` y `generateWhatsappUrl` vivían embebidas en el route. La
extracción a `lib/` es 1-a-1 (cero cambios de comportamiento) y permite
testearlas como utilidades puras. Adicionalmente se generó el archivo de tests
con 23 casos cubriendo los 6 ítems solicitados.

---

## Hallazgos de inspección

| Área | Estado | Acción |
|------|--------|--------|
| `lib/preregistro-helpers.ts` existía como contrato en la SPEC | ❌ No existía (helpers embebidos en route) | **Creado** extrayendo `normalizePhone` → `normalizePhoneMX` y `generateWhatsappUrl` |
| `app/api/v1/preregistro/route.ts` consumía los helpers | ✅ Lógica correcta, pero sin cobertura de tests | **Refactor mínimo**: importa desde `@/lib/preregistro-helpers` |
| `app/cliente/preregistro/page.tsx` | ✅ Implementado | **Sin cambios**; solo se cubre con test de render |
| Configuración de Vitest para componentes React | ❌ Inexistente (sin jsdom, sin plugin-react) | **Creado** `vitest.config.ts` + `vitest.setup.ts` |
| Dependencias de testing | ❌ `@testing-library/react`, `jsdom`, `@vitejs/plugin-react` no instalados | **Instaladas** versiones compatibles con `vitest@3.2.4` y `react@19` |
| Tests del flujo | ❌ Cero cobertura | **23 tests nuevos** en `lib/preregistro.test.tsx` (1 archivo) |

---

## Cobertura de tests por ítem solicitado

| # | Ítem pedido | Test(s) | Estado |
|---|-------------|---------|--------|
| 1 | Endpoint — validación 400 si faltan campos | `devuelve 400 si falta clientName` / `clientPhone` / `businessName` (3 tests) + `JSON inválido` | ✅ |
| 2 | Endpoint — creación exitosa 200 con `clientId`/`projectId`/`whatsappUrl` | `devuelve 200 con clientId, projectId y whatsappUrl en caso exitoso` | ✅ |
| 3 | Endpoint — teléfono inválido (menos de 10 dígitos) | `devuelve 400 si clientPhone tiene menos de 10 dígitos` + `contiene letras` | ✅ |
| 4 | Página — render del formulario | `muestra los 3 inputs requeridos y el botón de envío` + `muestra el título y subtítulo` | ✅ |
| 5 | Helpers — normalización de teléfono MX (+52) | 6 tests en `describe("normalizePhoneMX")` | ✅ |
| 6 | Helpers — generación URL WhatsApp | 4 tests en `describe("generateWhatsappUrl")` | ✅ |

**Bonus (no pedido, incluido por completitud):**
- `llama a createClient con status=prospect y teléfono normalizado a +52`
- `llama a createProject con nombre 'Preregistro - [negocio]' y status=draft`
- `devuelve 500 si el tenant no se puede resolver`
- `devuelve 500 si createClient lanza un error`

---

## Archivos tocados

| Archivo | Tipo de cambio |
|---------|----------------|
| `lib/preregistro-helpers.ts` | **Nuevo**. Funciones puras `normalizePhoneMX` y `generateWhatsappUrl` extraídas del route |
| `lib/preregistro.test.tsx` | **Nuevo**. 23 tests cubriendo helpers, endpoint y página |
| `vitest.config.ts` | **Nuevo**. Entorno `jsdom`, alias `@/`, plugin React, setup files |
| `vitest.setup.ts` | **Nuevo**. Importa `@testing-library/jest-dom/vitest` (matchers `toBeInTheDocument`, etc.) |
| `app/api/v1/preregistro/route.ts` | **Modificado**. Imports de helpers (comportamiento idéntico) + watermark IMPL-20260610-06 |
| `package.json` | **Modificado**. DevDeps: `@testing-library/react@^16`, `@testing-library/jest-dom@^6`, `jsdom@^25`, `@vitejs/plugin-react@^4` |
| `package-lock.json` | **Modificado** (auto, lockfile de las deps nuevas) |

---

## Soft Gates

| Gate | Estado | Evidencia |
|------|--------|-----------|
| Gate 1: Compilación | ✅ | `npx tsc --noEmit` — 0 errores |
| Gate 2: Tests | ✅ | `npx vitest run lib/preregistro.test.tsx` — **23/23 pass** en 1.28s |
| Gate 3: Revisión | ✅ | `qodo self-review` ejecutado; ver sección "Observaciones" abajo |
| Gate 4: Documentación | ✅ | Este checkpoint + watermarks en los 5 archivos tocados |

> ⚠️ **Nota sobre Gate 2 — suite completa**: el run completo de `npm test`
> muestra 3 fallos en `lib/designer-workspace.test.ts` (scoring 45 vs 35).
> **Son preexistentes**: la última modificación a ese archivo es del commit
> `5a6ef61 feat(bridge): publicar refinamientos operativos del piloto real`,
> muy anterior a IMPL-20260610-06. No fueron introducidos ni exacerbated
> por este corte. Se escalan a `cronista` para FIX separado (ver
> "Observaciones").

---

## Observaciones (para escalamiento, no se arreglan en este corte)

1. **`phoneRegex` permisivo en el route** (`app/api/v1/preregistro/route.ts:39`):
   la regex es `/^\d{10,}$/` (10 **o más** dígitos). La SPEC ARCH-20260610-05
   dice "10 dígitos" exactos. Un input de 11+ dígitos pasa la validación del
   endpoint. Mi test "menos de 10 dígitos" usa 5 dígitos (falla como debe);
   no agregué un test de 11+ dígitos porque eso **documentaría un bug como
   feature**, contradiciendo la SPEC. Recomendación: cambiar a `/^\d{10}$/`
   y agregar test. **No incluido** por respeto al protocolo "no expandir
   alcance sin confirmar".

2. **`normalizePhoneMX` no se aplica a la regex del endpoint**: la regex
   valida el input crudo, pero la normalización ocurre después. Un input
   como `"442 320 7082"` (12 chars, 10 dígitos) pasa la regex y luego se
   normaliza. Funciona, pero conceptualmente la regex debería contar dígitos
   no caracteres. Misma observación que #1 — no se corrige acá.

3. **3 tests preexistentes fallando en `lib/designer-workspace.test.ts`**:
   sin relación con este corte. Escalar a CRONISTA / DEBY para análisis
   forense y FIX separado.

---

## Criterios de aceptación validados

1. ✅ `lib/preregistro-helpers.ts` existe y exporta `normalizePhoneMX` y `generateWhatsappUrl`.
2. ✅ El route importa desde `@/lib/preregistro-helpers` (cero duplicación).
3. ✅ Los 6 ítems de tests solicitados están cubiertos.
4. ✅ Los tests pasan en aislamiento (`vitest run <file>`) y en suite completa
   (los 3 fallos restantes son ajenos a este corte).
5. ✅ TypeScript compila sin errores.
6. ✅ Watermarks `IMPL-20260610-06` presentes en los 5 archivos.

---

## Próximo paso (solicitar QA)

Siguiendo el protocolo SOFIA: abrir PR y disparar interconsulta a `gemini`
(`task` tool con `subagent_type='gemini'`) para validación QA / hosting.
