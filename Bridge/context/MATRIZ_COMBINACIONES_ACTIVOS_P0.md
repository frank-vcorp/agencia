# Matriz de Combinaciones de Activos P0

**ID:** ARCH-20260504-15  
**Proyecto:** Bridge  
**Fecha:** 2026-05-04  
**Estado:** Contrato inicial P0

## Objetivo

Cerrar las combinaciones mínimas válidas para el piloto obligatorio de Bridge V1.

## Regla

Solo estas combinaciones deben habilitarse en P0 para evitar ambigüedad y explosión de combinaciones.

## Combinaciones Válidas P0

| ID | Aplicativo | Tipo de pieza | Placement/uso | Formato | Familia | Campos guiados clave |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| p0_whatsapp_status_video | whatsapp | video | status | vertical_9_16 | visual | objetivo, oferta, publico, mensaje, CTA, referencias, restricciones |
| p0_whatsapp_dm_image | whatsapp | image | direct_message | square_1_1 | visual | objetivo, oferta, publico, mensaje, CTA, referencias, restricciones |
| p0_whatsapp_dm_copy | whatsapp | copy | direct_message | short_text | textual | objetivo, mensaje, tono, CTA, restricciones |
| p0_instagram_feed_square | instagram | image | feed | square_1_1 | visual | objetivo, oferta, publico, mensaje, CTA, referencias |
| p0_instagram_feed_vertical | instagram | image | feed | vertical_4_5 | visual | objetivo, oferta, publico, mensaje, CTA, referencias |
| p0_instagram_reel | instagram | reel | reel | vertical_9_16 | visual | objetivo, hook, oferta, CTA, referencias |
| p0_instagram_story | instagram | story | story | vertical_9_16 | visual | objetivo, mensaje, CTA, referencias |
| p0_facebook_feed_image | facebook | image | feed | square_1_1 | visual | objetivo, oferta, publico, mensaje, CTA |
| p0_facebook_story_video | facebook | video | story | vertical_9_16 | visual | objetivo, oferta, publico, mensaje, CTA |
| p0_facebook_ad_copy | facebook | copy | conversion | short_text | textual | objetivo, mensaje, CTA, tono |
| p0_tiktok_infeed_video | tiktok | video | in_feed | vertical_9_16 | visual | objetivo, hook, oferta, CTA, referencias |
| p0_google_search_text | google | text_ad | search | short_text | textual | objetivo, oferta, CTA, restricciones, destino |
| p0_google_display_banner | google | banner | display | horizontal_16_9 | visual | objetivo, oferta, publico, mensaje, CTA |
| p0_google_display_square | google | image | display | square_1_1 | visual | objetivo, oferta, publico, mensaje, CTA |
| p0_landing_hero | landing_page | landing_section | hero | long_text | estructural | objetivo, oferta, mensaje, CTA, referencias |
| p0_landing_benefits | landing_page | landing_section | conversion | long_text | estructural | objetivo, beneficios, oferta, CTA |

## Reglas de Uso

1. el agente desde VS Code debe proponer uno de estos IDs,
2. Bridge no debe aceptar combinaciones fuera de este listado en P0,
3. toda nueva combinación entra primero como P1 hasta ser validada,
4. cada combinación debe mapear a una familia de validación y a campos guiados obligatorios.

## Familias de Validación

### Visual

Validaciones mínimas:

1. formato obligatorio,
2. referencias opcionales pero recomendadas,
3. CTA aplicable,
4. plataforma compatible.

### Textual

Validaciones mínimas:

1. longitud esperada,
2. CTA cuando aplique,
3. tono,
4. destino o plataforma.

### Estructural

Validaciones mínimas:

1. objetivo de conversión,
2. bloque,
3. CTA,
4. mensaje principal.