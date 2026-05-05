# Catalogo Inicial de Activos V1

**ID:** ARCH-20260504-06  
**Proyecto:** Bridge  
**Fecha:** 2026-05-04  
**Estado:** Base inicial para tipificacion por seleccion

## Objetivo

Definir un catalogo inicial de aplicativos y tipos de activo comunes para que Bridge V1 use cajas de seleccion en lugar de texto libre al crear piezas.

## Criterio Rector

Bridge V1 no debe preguntar desde cero que pieza quiere el usuario si esa pieza ya pertenece a una familia conocida.

Primero se elige desde catalogo.

Luego se completa el contexto faltante.

La seleccion inicial puede ser hecha por un agente IA desde VS Code antes de que el humano revise o complete la solicitud dentro de Bridge.

## Estructura Recomendada de Seleccion

La tipificacion debe resolverse con cuatro cajas principales:

1. aplicativo,
2. tipo de pieza,
3. placement o uso,
4. formato tecnico.

## Caja 1. Aplicativo

Opciones iniciales recomendadas para V1:

1. WhatsApp,
2. Instagram,
3. Facebook,
4. TikTok,
5. Google,
6. YouTube,
7. Landing Page,
8. Sitio Web,
9. Email.

## Caja 2. Tipo de Pieza

Opciones iniciales recomendadas para V1:

1. imagen,
2. video,
3. carousel,
4. historia,
5. reel,
6. anuncio de texto,
7. banner,
8. portada,
9. copy,
10. landing section.

## Caja 3. Placement o Uso

Opciones iniciales recomendadas para V1:

1. feed,
2. story,
3. reel,
4. status,
5. display,
6. search,
7. in-feed,
8. hero,
9. mensaje directo,
10. remarketing,
11. captacion,
12. conversion,
13. awareness.

## Caja 4. Formato Tecnico

Opciones iniciales recomendadas para V1:

1. cuadrado 1:1,
2. vertical 4:5,
3. vertical 9:16,
4. horizontal 16:9,
5. display responsive,
6. texto corto,
7. texto largo.

## Catalogo Inicial por Aplicativo

### 1. WhatsApp

Activos tipicos a soportar:

1. video para status,
2. imagen para status,
3. imagen para envio directo,
4. video para envio directo,
5. copy para mensaje inicial,
6. pieza de promocion para compartir.

Presets utiles:

1. vertical 9:16 para status,
2. cuadrado 1:1 para compartir en chat,
3. copy corto orientado a accion,
4. CTA a contacto directo.

### 2. Instagram

Activos tipicos a soportar:

1. post imagen cuadrada,
2. post imagen vertical,
3. reel de video vertical,
4. story imagen,
5. story video,
6. carousel,
7. copy para caption.

Presets utiles:

1. cuadrado 1:1 para post,
2. vertical 4:5 para feed,
3. vertical 9:16 para reels y stories,
4. estructura de hook y CTA.

### 3. Facebook

Activos tipicos a soportar:

1. imagen para feed,
2. video para feed,
3. imagen para story,
4. video para story,
5. reel,
6. carousel,
7. anuncio con copy principal.

Presets utiles:

1. cuadrado 1:1,
2. vertical 4:5,
3. vertical 9:16,
4. texto primario,
5. titular,
6. CTA.

### 4. TikTok

Activos tipicos a soportar:

1. video vertical in-feed,
2. video vertical organico,
3. copy corto de apoyo,
4. guion corto para hook.

Presets utiles:

1. vertical 9:16,
2. hook en primeros segundos,
3. duracion breve,
4. CTA simple.

### 5. Google

Activos tipicos a soportar:

1. anuncio de texto para search,
2. imagen para display,
3. banner display,
4. creativo para demand gen,
5. creativo para performance max.

Presets utiles:

1. search con titulares y descripciones,
2. display cuadrado 1:1,
3. display horizontal 16:9,
4. imagenes multiples para combinacion automatica.

Nota de investigacion:

Google Ads documenta oficialmente familias como Search, Display, Demand Gen, Performance Max y Video, lo cual valida que Bridge use una seleccion por familia de activo en lugar de capturas libres.

### 6. YouTube

Activos tipicos a soportar:

1. video horizontal,
2. video vertical corto,
3. miniatura,
4. copy de titulo,
5. descripcion corta.

Presets utiles:

1. horizontal 16:9,
2. vertical 9:16 para shorts,
3. hook inicial,
4. llamada a accion.

### 7. Landing Page

Activos tipicos a soportar:

1. hero section,
2. imagen principal,
3. copy principal,
4. CTA,
5. seccion de beneficios,
6. formulario.

Presets utiles:

1. objetivo de conversion,
2. mensaje principal,
3. CTA,
4. estructura por bloques.

### 8. Sitio Web

Activos tipicos a soportar:

1. banner principal,
2. bloque de servicio,
3. imagen de apoyo,
4. copy de servicio,
5. CTA,
6. iconografia o recursos visuales.

### 9. Email

Activos tipicos a soportar:

1. asunto,
2. cuerpo corto,
3. cuerpo largo,
4. banner,
5. CTA,
6. seguimiento.

## Seleccion Recomendada de V1

Para no inflar demasiado la primera version, la recomendacion es arrancar con estos aplicativos como principales:

1. WhatsApp,
2. Instagram,
3. Facebook,
4. TikTok,
5. Google,
6. Landing Page.

Y dejar como secundarios en V1:

1. YouTube,
2. Sitio Web,
3. Email.

## Como Debe Verse en la Interfaz

La creacion de activos no debe empezar con un textarea vacio.

Debe verse asi:

1. seleccionar aplicativo,
2. seleccionar tipo de pieza,
3. seleccionar placement o uso,
4. seleccionar formato tecnico,
5. completar campos guiados del prompt.

En el flujo ideal de V1, estas cajas pueden llegar prellenadas por el agente operador desde VS Code.

Bridge debe permitir dos modos:

1. seleccion asistida por agente,
2. ajuste o correccion humana dentro de la interfaz.

## Campos Guiados de Prompt Recomendados

Despues de las cajas de seleccion, Bridge debe pedir solo los campos que cambian por pieza.

Campos recomendados:

1. objetivo,
2. oferta,
3. publico,
4. mensaje principal,
5. CTA,
6. tono,
7. referencias,
8. restricciones,
9. notas del operador.

## Decision Arquitectonica

Bridge V1 debe modelar los activos desde un catalogo de opciones frecuentes.

No desde entradas libres sin estructura.

El agente IA que opere desde VS Code debe consumir este catalogo y mapear sus salidas a opciones validas de seleccion.

Eso vuelve mas claro el sistema para:

1. el operador,
2. el diseñador,
3. el cliente,
4. los agentes,
5. el futuro analisis de rendimiento por tipo de activo.