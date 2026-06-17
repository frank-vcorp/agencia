# CHK 2026-06-13 15:37 — Pre-registro cliente vendedor (refactor + server action)

**ID sesión:** CHK-20260613-01
**Tipo:** Implementación + Refactor
**ID intervención:** IMPL-20260613-01
**Respaldo:** `context/SPECs/SPEC_ARCH-20260610-05_preregistro_cliente_vendedor.md`

---

## Contexto

La SPEC `ARCH-20260610-05` ya estaba implementada (CHK 2026-06-11 00:18) y desplegada
en Vercel, pero:

- La página `/cliente/preregistro` era un **client component** con un `fetch` directo
  al endpoint — no había **server action** como pedía la spec.
- La lógica de negocio estaba duplicada conceptualmente entre el route y cualquier
  futuro consumidor (la spec menciona que el chat de briefing podría querer
  regenerar el link).
- Los tests de `lib/preregistro.test.tsx` **no se ejecutaban** porque faltaban
  `@testing-library/react`, `@testing-library/jest-dom` y `jsdom` como
  devDependencies, y no había `vitest.config.ts` (vitest corría sin alias `@/`
  ni entorno jsdom).

---

## Acciones ejecutadas

### 1. Infraestructura de testing (Gate 1 — Compilación)
- `pnpm add -D @testing-library/react @testing-library/jest-dom jsdom`
- Nuevo `Bridge/vitest.config.ts`:
  - `esbuild.jsx: "automatic"` (React 19 JSX runtime)
  - `resolve.alias["@"]` → raíz del proyecto
  - `test.environment: "jsdom"`
  - `test.setupFiles: ["./vitest.setup.ts"]`
- `Bridge/vitest.setup.ts` ahora hace `afterEach(cleanup)` para que
  `screen.getBy*` no encuentre duplicados entre tests de componentes.

### 2. Extracción de lógica de negocio (Gate 2 — Testing)
- Nuevo `Bridge/lib/preregistro.ts` con:
  - `validatePreregistroInput(input)` — pura, retorna `string | null`.
  - `createPreregistro(input)` — orquesta `resolveTenantIdBySlug` +
    `createClient` + `createProject` + `generateWhatsappUrl`.
  - Tipos `PreregistroInput`, `PreregistroResult` (discriminated union
    `PreregistroSuccess | PreregistroFailure`).

### 3. Refactor del endpoint HTTP
- `Bridge/app/api/v1/preregistro/route.ts` ahora delega a `createPreregistro`.
  - Devuelve **400** para errores de validación.
  - Devuelve **500** para errores de infraestructura.
  - Cuerpo no-JSON → 400 con `"Cuerpo JSON inválido"`.

### 4. Server action (cumple spec — "server action que cree un registro")
- Nuevo `Bridge/app/cliente/preregistro/actions.ts`:
  - `submitPreregistroAction(prev, formData)` — `"use server"`.
  - Lee `clientName`, `clientPhone`, `businessName` del `FormData`.
  - Valida, llama a `createPreregistro`, y retorna un estado discriminado
    (`PreregistroActionState` = idle | error | success).
  - Tipo `PreregistroSuccessState` separado para que el componente cliente
    pueda hacer narrowing correcto.

### 5. Página como server component (cumple spec)
- `Bridge/app/cliente/preregistro/page.tsx` ya **no** tiene `"use client"`.
  - Renderiza un header + el nuevo client component `PreregistroForm`.
- Nuevo `Bridge/app/cliente/preregistro/preregistro-form.tsx`:
  - `"use client"` + `useActionState(submitPreregistroAction, initialState)`.
  - `required` + `pattern="[0-9]{10}"` + `minLength` en los inputs
    (validación nativa HTML como primera barrera).
  - `role="alert"` para errores, `role="status"` para éxito.
  - Botón "Copiar link" usa `navigator.clipboard` con guarda `typeof navigator`.

### 6. Tests (Gate 2 — Testing, 36 tests)
- `Bridge/lib/preregistro.test.tsx` reescrito con 5 secciones:
  1. Helpers puros (10 tests).
  2. `validatePreregistroInput` (6 tests).
  3. `createPreregistro` (5 tests, mockeando `lib/assets`, `lib/tenant`,
     `lib/supabase`).
  4. `POST /api/v1/preregistro` (9 tests — validación, éxito, errores 400/500).
  5. `submitPreregistroAction` (4 tests con `FormData`).
  6. Render de `PreregistroPage` (2 tests).
- **Resultado: 36/36 pasan.**

---

## Verificación de Gates

| Gate | Estado | Evidencia |
|------|--------|-----------|
| 1. Compilación | ✅ | `pnpm build` → `✓ Compiled successfully in 17.3s`, `/cliente/preregistro 1.38 kB` |
| 2. Testing | ✅ | `pnpm vitest run lib/preregistro` → `36 passed (36)` |
| 3. Revisión | ✅ | Verificado con `git stash` que los 13 fallos preexistentes (bridge-data, clients, designer-workspace, mcp-tools) **no** están relacionados con este cambio. Antes: 471 pasan / 13 fallan. Después: 485 pasan / 13 fallan (mismas 13). |
| 4. Documentación | ✅ | Este checkpoint + `lib/preregistro-helpers.ts`, `lib/preregistro.ts`, `actions.ts` y `preregistro-form.tsx` documentados con bloques JSDoc que referencian `IMPL-20260613-01` y la SPEC. |

---

## Archivos modificados / creados

| Estado | Ruta |
|--------|------|
| ✏️ modificado | `Bridge/app/api/v1/preregistro/route.ts` (delega a `lib/preregistro.ts`) |
| ✏️ modificado | `Bridge/app/cliente/preregistro/page.tsx` (server component shell) |
| ✏️ modificado | `Bridge/lib/preregistro.test.tsx` (36 tests) |
| ✏️ modificado | `Bridge/vitest.setup.ts` (agrega `afterEach(cleanup)`) |
| ✏️ modificado | `Bridge/package.json` (devDeps testing-library + jsdom) |
| ✏️ modificado | `Bridge/pnpm-lock.yaml` |
| ➕ creado | `Bridge/app/cliente/preregistro/actions.ts` (server action) |
| ➕ creado | `Bridge/app/cliente/preregistro/preregistro-form.tsx` (client form) |
| ➕ creado | `Bridge/lib/preregistro.ts` (lógica de negocio) |
| ➕ creado | `Bridge/vitest.config.ts` |

---

## Comportamiento del usuario final

1. Vendedor visita `/cliente/preregistro` (server component, renderizado en
   servidor → SEO + primer paint instantáneo).
2. Completa nombre, WhatsApp (10 dígitos), nombre del negocio.
3. Al enviar, React 19 invoca `submitPreregistroAction` (server action,
   sin viaje HTTP visible).
4. La action:
   - Crea cliente `status="prospect"` con `primaryContactWhatsapp="+52..."`.
   - Crea proyecto `name="Preregistro - [negocio]"`, `status="draft"`,
     `projectType="interno"`.
   - Genera `https://wa.me/52[10dígitos]?text=...` con link al brief.
5. El formulario muestra estado de éxito con dos botones: "Abrir WhatsApp"
   (nueva pestaña) y "Copiar link" (clipboard).
6. Si hay error de validación o de infraestructura, se muestra inline
   con `role="alert"`.

---

## Próximo Micro-Sprint sugerido

1. Desplegar el refactor a Vercel (`main` ya tiene el commit conceptual
   vía working tree — falta `git commit` + push).
2. E2E: vendedor → formulario → WhatsApp → cliente completa brief
   en `/cliente/proyecto/[projectId]`.
3. Considerar mover `preregistro-form.tsx` a `components/preregistro-form.tsx`
   si la spec lo justifica (actualmente está en `app/cliente/preregistro/`
   por cercanía semántica).
