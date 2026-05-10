# SPEC ARCH-20260510-03

## Titulo

Chat asistente de produccion creativa para el diseñador — powered by Gemini

## Estado

Autorizado — listo para implementar

## Fecha

2026-05-10

## ID de Intervencion

ARCH-20260510-03

## Objetivo

Agregar un chat asistente dentro de la superficie del diseñador en Bridge que responda dudas sobre el uso de herramientas Adobe (Firefly, Express, Photoshop Online, Premiere Rush) y sobre como iterar resultados de IA de forma eficiente.

El asistente NO es un chatbot general. Su dominio esta acotado a produccion creativa con IA.

## Problema que Resuelve

El diseñador en este flujo no produce manualmente — dirige a la IA para que genere las piezas y tiene criterio para juzgar si el resultado es correcto o no. Cuando el resultado no convence, necesita saber si conviene:

1. ajustar el prompt y regenerar,
2. editar directamente en la herramienta,
3. cambiar parametros de generacion (diversidad, estilo, modo),
4. usar una herramienta diferente para un ajuste puntual.

Sin apoyo, el diseñador itera a ciegas o pierde tiempo en trial and error innecesario.

## Contexto del Flujo de Trabajo

El operador (Frank) prepara todo antes de asignar al diseñador:
- Crea el Custom Model del cliente en Firefly (esa es la fuente de consistencia visual)
- Define el prompt vigente del activo en Bridge
- Asigna el activo con herramienta, formato y contexto listos

El diseñador llega, ve el activo asignado y produce. No define el estilo ni decide que hacer — ejecuta con criterio creativo.

**Implicacion para el asistente:** No responde preguntas sobre estilo del cliente ni sobre que producir. Para esas preguntas, redirige al activo en Bridge y al Custom Model en Firefly.

## Motor de IA

**Gemini Flash (Google AI)** — capa gratuita para v1.

- SDK: `@google/generative-ai`
- Modelo: `gemini-2.5-flash` — estable, multimodal, mejor relación precio-rendimiento (mayo 2026)
- API Key: variable de entorno `GEMINI_API_KEY`
- Limites capa gratuita: 15 RPM, 1M tokens/dia — suficiente para el volumen inicial

No se usa Claude ni OpenAI. La decision es Gemini para mantener costo cero en el arranque.

## System Prompt del Asistente

Este prompt va en el backend, nunca expuesto al cliente:

```
Eres un asistente senior de produccion creativa con IA para disenadores
que trabajan con Adobe Firefly, Express, Photoshop Online y Premiere Rush.

El disenador no produce a mano — dirige a la IA para que genere las piezas.
Su trabajo es juzgar el resultado y saber como llegar a una pieza que valga
la pena subir a Bridge.

Tu rol es ayudarle a:
- Decidir si conviene ajustar el prompt y regenerar, o editar directamente
  en la herramienta — segun que sea mas eficiente en cada caso
- Ajustar prompts cuando el resultado no convence
- Usar las herramientas Adobe para ediciones puntuales sin empezar desde cero
- Iterar de forma eficiente hasta que la pieza este lista

El operador ya dejo todo listo: el Custom Model del cliente en Firefly y el
prompt base en Bridge. El disenador no define el estilo — lo aplica.
Si pregunta por estilo del cliente o que producir: responde exactamente esto:
"Eso ya esta resuelto en el activo de Bridge — revisa el prompt vigente y usa
el Custom Model del cliente en Firefly."

Habla claro y directo. Sin tecnicismos innecesarios. Como si le explicaras
a alguien que sabe hacer su trabajo pero no necesita que le hablen como en un
manual.

Si la pregunta no tiene que ver con produccion creativa con IA, responde:
"Eso esta fuera de mi area."
```

## Inyeccion de Contexto del Activo

Cuando el diseñador tiene un activo activo abierto, el backend inyecta contexto adicional al system prompt. Este contexto se usa **solo si la pregunta lo requiere** — no se fuerza en cada respuesta:

```
[Contexto del activo activo — usa solo si la pregunta lo requiere]
Herramienta asignada: {asset.tool}
Prompt vigente: {asset.promptText}
Formato requerido: {asset.format}
Nombre del activo: {asset.name}
```

Si el diseñador no tiene un activo abierto, el contexto no se inyecta y el asistente responde de forma generica sobre las herramientas.

## Dominio de Preguntas que Responde

Ejemplos representativos (no exhaustivos):

- "La imagen que genero Firefly se ve rara, que le cambio al prompt?"
- "Como le digo que el tono sea mas calido sin que cambie todo?"
- "Genere 4 variantes y ninguna convence, que estoy haciendo mal?"
- "El fondo quedo mal pero el sujeto esta perfecto, conviene regenerar o hay otra forma?"
- "Como exporto en el formato correcto desde Express?"
- "Como hago variantes para Story y Feed al mismo tiempo?"
- "Como cargo el Custom Model que dejo el operador en Firefly?"
- "Premiere Rush me da un error al exportar, que hago?"

## Dominio de Preguntas que NO Responde

- "Como debe verse la marca del cliente X?" → redirige al activo y al Custom Model
- "Que pieza debo hacer hoy?" → redirige al activo asignado en Bridge
- "Me puede hacer el diseno de logo?" → fuera de area
- Cualquier pregunta no relacionada con produccion creativa con Adobe

## Arquitectura Tecnica

### Ruta API

```
POST /api/designer-chat
```

**Request body:**
```typescript
{
  message: string            // Pregunta del diseñador
  imageBase64?: string       // Opcional — imagen adjunta en base64
  imageMimeType?: string     // Opcional — "image/jpeg" | "image/png" | "image/webp"
  assetContext?: {           // Opcional — solo si hay activo abierto
    tool: string
    promptText: string
    format: string
    name: string
  }
}
```

**Response:**
```typescript
{
  reply: string              // Respuesta del asistente
}
```

**Nota multimodal:** Cuando viene `imageBase64`, se pasa a Gemini como parte del contenido del mensaje. Gemini 1.5 Flash soporta vision nativa — puede analizar la imagen generada y comentar sobre ella ("el fondo se ve desenfocado", "el prompt no coincide con el resultado", etc.).

### Implementacion

- Server Action o Route Handler en `app/api/designer-chat/route.ts`
- Llama a Gemini con `@google/generative-ai`
- Construye el system prompt dinamicamente con o sin contexto del activo
- No guarda historial de conversacion en v1 (cada mensaje es independiente)
- Si Gemini falla → respuesta de fallback: "No pude conectarme al asistente. Intenta de nuevo."

### Seguridad

- `GEMINI_API_KEY` solo en variables de entorno del servidor, nunca expuesta al cliente
- Rate limiting basico: max 20 peticiones por minuto por sesion (para no agotar cuota gratuita)
- Validacion de input: mensaje max 500 caracteres, assetContext sanitizado

## Componente UI

### Ubicacion

Barra lateral derecha fija dentro de `/disenador`, similar al panel de chat de un IDE. Siempre visible, no flotante ni colapsable en v1. El layout del disenador se divide en dos columnas: contenido principal a la izquierda, asistente a la derecha.

**Dimensiones:** Barra derecha de ancho fijo `w-80` (320px) en desktop. En mobile ocupa pantalla completa con tab de navegacion entre vista de activos y asistente.

### Comportamiento

- Campo de texto multilinea + boton de envio
- El diseñador puede **pegar imagenes** (Ctrl+V / Cmd+V) directamente en el campo
- El diseñador puede **subir imagenes** con un boton de adjuntar (icono clip)
- Formatos de imagen aceptados: JPG, PNG, WEBP — max 4MB por imagen
- Preview de la imagen adjunta antes de enviar, con opcion de eliminarla
- Muestra respuesta de Gemini debajo del input
- Indicador de carga mientras espera respuesta
- Sin historial visible en v1 — cada pregunta es nueva
- Si no hay activo activo, muestra placeholder: "Preguntame sobre Firefly, Express o cualquier herramienta Adobe"
- Si hay activo activo, muestra placeholder: "Preguntame como trabajar este activo en {herramienta}"

### Nombre visible para el diseñador

**"Asistente de produccion"** — sin mencionar Gemini ni IA en el nombre del panel.

## Archivos a Crear o Modificar

| Archivo | Accion | Descripcion |
|---|---|---|
| `app/api/designer-chat/route.ts` | Crear | Route handler que llama a Gemini |
| `lib/designer-chat.ts` | Crear | Logica de construccion del system prompt y llamada a Gemini |
| `lib/designer-chat.test.ts` | Crear | Tests del contrato: system prompt, contexto, fallback |
| `components/designer-chat-panel.tsx` | Crear | Componente UI del chat |
| `app/disenador/page.tsx` | Modificar | Integrar el panel de chat |
| `package.json` | Modificar | Agregar `@google/generative-ai` |
| `.env.local` | Modificar | Agregar `GEMINI_API_KEY` (no se commitea) |
| `.env.example` | Modificar | Documentar `GEMINI_API_KEY=` |

## Dependencias

```bash
npm install @google/generative-ai
```

Una sola dependencia nueva.

## Variables de Entorno

```bash
# .env.local (no se commitea)
GEMINI_API_KEY=tu_api_key_aqui

# .env.example (se commitea sin valor)
GEMINI_API_KEY=
```

## Criterios de Aceptacion

1. El panel de chat aparece como barra lateral derecha en `/disenador`.
2. El diseñador puede escribir una pregunta y recibir una respuesta de Gemini.
3. El diseñador puede pegar una imagen (Ctrl+V) o subirla con el boton de adjuntar.
4. Si se adjunta imagen, Gemini la analiza junto con el mensaje.
5. Si hay un activo activo, el contexto (herramienta, prompt, formato) se inyecta automaticamente.
6. Si el diseñador pregunta por estilo o que producir, el asistente lo redirige correctamente.
7. Si Gemini falla, muestra el mensaje de fallback — no rompe la UI.
8. La API key no es visible en ningun bundle del cliente.
9. Los tests de `designer-chat.test.ts` pasan (system prompt valido, contexto inyectado, imagen, fallback).
10. Build y tests generales pasan (304+ tests).
11. El componente funciona en mobile.

## Fuera de Alcance en v1

1. Historial de conversacion persistido en base de datos
2. Historial visible en la UI
3. Respuestas streaming (v2)
4. Analisis automatico SIN intervencion del diseñador (en v1 el diseñador sube la imagen voluntariamente)
5. Chat disponible en el portal Cliente o en Operador
6. Soporte de video adjunto

## Relacion con Otras SPECs

- Complementa SPEC-37 (Copiloto operativo vivo) — esa SPEC cubre la señal viva del dashboard; esta SPEC cubre el chat asistente de produccion
- Complementa SPEC-38 (Superficies guiadas por IA) — la capa de Ejecucion del diseñador descrita en SPEC-38 es el contexto en el que aparece este chat

## Notas de Implementacion para SOFIA

1. Instalar `@google/generative-ai` antes de todo
2. El system prompt se construye en `lib/designer-chat.ts`, no inline en la ruta
3. El contexto del activo es opcional — si no viene en el request, el system prompt no incluye la seccion de contexto
4. Usar `generateContent` con `systemInstruction` para separar el system prompt del mensaje del usuario
5. El rate limiting puede ser un simple contador en memoria para v1 — no necesita Redis
6. El componente UI no necesita estado global — local state con useState es suficiente
