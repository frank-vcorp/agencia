# CHECKPOINT IMPL-20260510-02

## ID de Intervención
IMPL-20260510-02

## Fecha
2026-05-10

## Agente
SOFIA — Builder

## Tarea
Implementar el asistente de producción creativa con Gemini para el workspace del diseñador en Bridge.

## SPEC de Referencia
`context/SPECs/SPEC_ARCH-20260510-03_chat_asistente_produccion_disenador.md`

---

## Archivos Creados o Modificados

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `lib/designer-chat.ts` | Crear | `buildSystemPrompt` y `callGemini` con soporte multimodal y fallback |
| `lib/designer-chat.test.ts` | Crear | 9 tests: buildSystemPrompt (6) y callGemini con mocks (3) |
| `app/api/designer-chat/route.ts` | Crear | POST handler con validación, rate limiting 20 req/min por IP |
| `components/designer-chat-panel.tsx` | Crear | Panel lateral estilo IDE con soporte de imagen y paste |
| `app/disenador/page.tsx` | Modificar | Layout flex-row desktop / stacked mobile + assetContext |
| `.env.example` | Modificar | Agrega `GEMINI_API_KEY=` con nota server-only |

---

## Dependencia Instalada

```
@google/generative-ai — SDK oficial de Google para Gemini Flash
```

---

## Decisiones Técnicas

### Mock de Vitest para @google/generative-ai
El patrón correcto en Vitest es declarar `vi.mock(...)` al nivel de módulo (se hoista automáticamente) con una variable `mockGenerateContent = vi.fn()` accesible en el scope del archivo. No se usan `await import()` dinámicos por test — eso causa que el cache de módulos no reciba el mock correctamente.

### Rate Limiting en memoria
Map en memoria con TTL de 60 segundos por IP. Apropiado para v1 con capa gratuita de Gemini (15 RPM). No persiste entre reinicios — aceptable para el volumen inicial.

### assetContext en page.tsx
Se extrae del `activeTask ?? nextSuggestedTask` del workspace. Si ninguno existe, se pasa `undefined` al panel y el asistente opera en modo genérico.

### Layout del diseñador
`flex flex-col gap-5 lg:flex-row lg:items-start` — stacked en mobile, flex-row en desktop. El chat panel ocupa `w-80 shrink-0` en desktop y `w-full` en mobile.

### Seguridad: GEMINI_API_KEY nunca sale al cliente
Solo se usa en `app/api/designer-chat/route.ts` (Server-side Route Handler). El componente cliente solo hace fetch a `/api/designer-chat` — nunca accede a la key directamente. Build verifica que no hay `NEXT_PUBLIC_GEMINI_API_KEY`.

---

## Validación de Soft Gates

### Gate 1: Compilación ✓
```
npm run build → ✓ Build verde
/api/designer-chat registrada como ruta dinámica (ƒ)
/disenador compilada con 4.12 kB
```

### Gate 2: Testing ✓
```
Tests: 313/313 pasando (9 nuevos en designer-chat.test.ts)
npm run test → ✓ 15 archivos de test, 0 fallos
```

### Gate 3: Revisión ✓
- No hay `any` en TypeScript
- `GEMINI_API_KEY` solo en variables de entorno del servidor
- Validación de input: message max 500 chars, assetContext tipado y sanitizado
- Rate limiting en memoria antes de llamar a Gemini
- Fallback ante error de Gemini: nunca expone el error raw al cliente

### Gate 4: Documentación ✓
- Watermark `IMPL-20260510-02` en todos los archivos creados/modificados
- `.env.example` actualizado
- Este checkpoint generado

---

## Resultado
El diseñador tiene una barra lateral derecha en `/disenador` donde puede:
1. Escribir preguntas sobre herramientas Adobe (Firefly, Express, Photoshop, Premiere Rush)
2. Adjuntar imágenes via botón clip o pegar con Ctrl+V desde el textarea
3. Ver preview de la imagen antes de enviar (con botón ×)
4. Recibir respuestas de Gemini Flash con contexto del activo activo (si lo hay)
5. El asistente opera en modo genérico si no hay activo enfocado

---

## Commit
`feat(disenador): agregar asistente de produccion creativa con Gemini`
Hash: `f3ca244`
