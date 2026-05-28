---
name: vika-crear-cliente
description: "Protocolo obligatorio para crear un cliente en Bridge con datos de contacto completos. Usar cuando: el usuario pide crear un cliente, registrar un nuevo cliente, dar de alta un cliente, o cualquier instrucción equivalente que implique llamar bridge_create_client."
---

# Vika — Crear Cliente con Datos de Contacto

<!-- ARCH-20260528-05 | ref: Bridge/context/SPECs/SPEC_ARCH-20260528-05_directorio_clientes_operador_v1.md -->

## Cuándo usar esta skill

- El usuario pide crear un cliente nuevo.
- El usuario menciona nombre de empresa y quiere registrarla en Bridge.
- Antes de llamar `bridge_create_client` por cualquier razón.

## Protocolo obligatorio antes de crear

Antes de llamar `bridge_create_client`, DEBES tener los siguientes datos.
Si no los tienes, pregúntalos explícitamente en UN SOLO mensaje:

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `name` | ✅ Sí | Nombre comercial de la empresa o cliente |
| `primaryContactName` | ✅ Sí | Nombre de la persona de contacto |
| `primaryContactEmail` | ✅ Sí | Email del contacto principal |
| `primaryContactWhatsapp` | ✅ Sí | Número WhatsApp con código de país, ej: +5215512345678 |
| `legalName` | ⚠️ Opcional | Razón social (si difiere del nombre comercial) |
| `status` | ⚠️ Opcional | Por defecto: `active` |
| `notes` | ⚠️ Opcional | Notas internas |

## Formato de pregunta

Si faltan datos obligatorios, usa este formato de pregunta compacto:

```
Para crear el cliente necesito:
- Nombre del contacto principal:
- Email:
- WhatsApp (con código de país, ej: +5215512345678):
```

## Prohibiciones

- ❌ NO llamar `bridge_create_client` con `primaryContactEmail` o `primaryContactWhatsapp` vacíos o nulos si el usuario no los indicó explícitamente.
- ❌ NO inventar datos de contacto.
- ❌ NO asumir que el nombre comercial es el nombre del contacto.

## Después de crear

1. Confirmar con el ID devuelto por el MCP.
2. Preguntar si se quiere crear un proyecto para este cliente ahora o después.
3. Si el email fue provisto y `emailSent: true` en la respuesta, mencionar brevemente que se envió email de bienvenida.
4. Si se devuelve `whatsAppLink`, ofrecerlo como enlace directo de bienvenida.

## Ejemplo de flujo correcto

```
Usuario: "Crea el cliente RodaMax"

Vika: "Para crear el cliente necesito:
- Nombre del contacto principal:
- Email:
- WhatsApp (con código de país, ej: +5215512345678):"

Usuario: "Jorge Torres, jorge@rodamax.com, +5215556781234"

Vika: [llama bridge_create_client con todos los campos] → Confirma creación con ID.
```
