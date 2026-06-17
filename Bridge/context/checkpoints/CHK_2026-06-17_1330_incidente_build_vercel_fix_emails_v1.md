# CHK_2026-06-17_1330_incidente_build_vercel_fix_emails_v1

**ID sesión:** CHK-20260617-02
**Tipo:** Incidente de build + hotfix
**Proyecto:** Bridge
**Fecha:** 2026-06-17 13:30 CST
**Severidad:** Alta (3 deploys consecutivos fallidos en producción)

---

## Resumen

3 deploys consecutivos a producción fallaron en el paso `next build` de Vercel con el mismo error de TypeScript: `Cannot find module '@react-email/html'` y 9 subpaquetes más. Causa raíz: las dependencias directas `@react-email/*` se removieron del lockfile pero los archivos `emails/*.tsx` seguían importando desde los subpaquetes individuales.

Resolución en menos de 5 minutos: migrar los 10 imports de cada archivo a un único import desde `@react-email/components` (que sí está declarado como dep y reexporta todo). Validado con build local y deploy verificado en producción.

---

## Cronología

| Hora | Evento |
|------|--------|
| 13:11:48 | Deploy de `4861268` (chore gitignore) → **Error 49s** en Vercel |
| 13:17:31 | Deploy de `a860c1b` (SPEC docs briefs) → **Error 49s** |
| 13:23:35 | Deploy de `453fa09` (sync PROYECTO) → **Error 51s** |
| 13:27:28 | Usuario reporta fallo con logs de los 3 deploys |
| 13:30:00 | Diagnóstico: imports rotos en `Bridge/emails/{asset-delivered,quotation-active,client-created}.tsx` |
| 13:31:00 | Fix aplicado: unificación de imports a `@react-email/components` |
| 13:32:00 | Build local verde (`pnpm run build` sin errores) |
| 13:33:00 | Commit `a59afbb` pusheado a `main` |
| 13:34:00 | Deploy verificado: `https://vectoria-zeta.vercel.app/briefs` → **HTTP 200** |

---

## Causa raíz

### Estado declarado en `package.json`
```json
"@react-email/components": "^1.0.12",
"@react-email/render": "^2.0.8",
```

### Estado en `node_modules`
Solo los paquetes resueltos transitivamente por `@react-email/components` están disponibles (html, head, body, etc.) pero **NO como dependencias directas resolubles para type-checking**.

### Estado en código (3 archivos)
Cada archivo `emails/*.tsx` importaba desde subpaquetes directos:
```ts
import { Html } from "@react-email/html";
import { Head } from "@react-email/head";
// ... 8 imports más
```

TypeScript strict mode de Next.js falla el build porque no puede resolver declaraciones de tipo para esos subpaquetes.

### Hipótesis de cuándo se rompió
Probablemente durante una actualización de `@react-email/components` (de v0.x a v1.x) el modelo de imports cambió a reexportar todo desde el paquete umbrella. Los archivos nunca se migraron y el bug se mantuvo latente hasta que el lockfile se regeneró en esta sesión (commits del preregistro trajeron cambios en deps), exponiendo el problema.

### Por qué pasó en Vercel pero no localmente
Localmente el `node_modules` ya tenía los subpaquetes como transitivos en el árbol de pnpm. Vercel reinstala limpio y solo resuelve deps declaradas en `package.json` y transitivas requeridas, pero TypeScript con `moduleResolution: bundler` exige declaraciones de tipo accesibles desde el import path. La resolución de transitivos no garantiza declaraciones de tipo exportadas.

---

## Resolución

### Archivos modificados
- `Bridge/emails/asset-delivered.tsx`
- `Bridge/emails/quotation-active.tsx`
- `Bridge/emails/client-created.tsx`

### Cambio
Reemplazado el bloque de 10 imports de subpaquetes por 1 import desde `@react-email/components`:

```ts
import {
  Body, Button, Container, Head, Heading, Hr,
  Html, Preview, Section, Text
} from "@react-email/components";
```

### Validación
- `pnpm run build` local → 0 errores, todas las rutas compilan.
- Deploy en Vercel → HTTP 200 en `/briefs` después de 45s de propagación.

---

## Decisión de no rollback

Se evaluó la opción de `git revert` de los 4 commits de la sesión para volver al estado pre-fix. Decisión: NO rollback. Razones:
1. El hotfix es trivial (3 archivos, 36 líneas modificadas, 0 cambios funcionales).
2. Hacer rollback implicaba perder 7 commits de trabajo real (tabla de briefs, brand kit, preregistro).
3. El fix preserva la funcionalidad de los emails (los mismos componentes, mismo árbol JSX, misma API pública de cada plantilla).

---

## Aprendizajes

1. **No confiar en imports transitivos** — Vercel reinstala limpio y TypeScript strict mode falla con imports que no son deps directas declaradas. Regla nueva: cada import debe resolverse a una dep en `package.json` o a un barrel reexport explícito.

2. **Build local ≠ build de producción** — La divergencia de comportamiento entre `node_modules` local (acumulado) y CI (limpio) expuso el bug. Recomendación: agregar `pnpm install --frozen-lockfile` al pre-commit hook o usar `vercel build` local antes de push crítico.

3. **Sincronización con Vercel es asíncrona** — El usuario solo vio el fallo minutos después del push. Sugerencia: agregar un check post-push que haga `curl` al deploy y verifique status.

---

## Tickets derivados

1. **Lint rule para detectar imports desde `@react-email/*` directos** (cualquier import que no sea `@react-email/components` o `@react-email/render`). Pendiente para próxima sesión.
2. **Verificar que `pnpm install --frozen-lockfile` se ejecute en pre-commit** para evitar esta clase de drift. Pendiente.
3. **Auditar el resto del proyecto en busca de imports transitivos** que podrían romperse en el próximo deploy. Pendiente.

---

## Indicador de finalización

✅ **Incidente cerrado.** Producción sirviendo HTTP 200, hotfix pusheado, causa raíz identificada y documentada, aprendizajes registrados.
