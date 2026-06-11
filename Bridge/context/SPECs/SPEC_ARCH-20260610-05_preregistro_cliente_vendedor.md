# SPEC ARCH-20260610-05 — Pre-registro cliente vía vendedor

**ID:** ARCH-20260610-05  
**Fecha:** 2026-06-10  
**Estado:** Implementado (en deploy)  

---

## 🎯 Objetivo

Crear un flujo donde el vendedor pueda dar de alta un prospecto que luego complete su brief desde su dispositivo móvil, con URL entregada vía WhatsApp.

---

## 📋 Alcance técnico (4 archivos)

| Archivo | Función |
|---------|---------|
| `app/api/v1/preregistro/route.ts` | Endpoint POST que crea cliente/proyecto y genera link WhatsApp |
| `app/cliente/preregistro/page.tsx` | Formulario para vendedor (nombre, WhatsApp, negocio) |
| `lib/preregistro-helpers.ts` | Helpers de normalización de teléfono y generación de URL |
| `context/SPECs/SPEC_ARCH-20260610-05_preregistro_cliente_vendedor.md` | Documentación del contrato |

---

## 🔌 Contrato API

```
POST /api/v1/preregistro
Content-Type: application/json

{
  "clientName": "Juan Pérez",
  "clientPhone": "4423207082",     // 10 dígitos
  "businessName": "Taller Rodamax"  // nombre del negocio
}

Response 200:
{
  "ok": true,
  "clientId": "...",
  "projectId": "...",
  "whatsappUrl": "https://wa.me/524423207082?text=Hola%21..."
}
```

---

## 📱 Flujo de usuario

1. **Vendedor** → `/cliente/preregistro` 
2. Completa formulario
3. Sistema crea:
   - Cliente con `status: "prospect"`
   - Proyecto `"Preregistro - [negocio]"`
4. Sistema entrega **link WhatsApp** al vendedor
5. **Cliente** hace click → `/cliente/proyecto/[projectId]`
6. **Cliente** completa brief vía chat (sin loop - FIX-20260529-03 aplicado)

---

## ✅ Validación

- Build ✅
- Tests por crear
- Deploy Vercel pendiente