/*
 * IMPL-20260513-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260513-01_contacto_cliente_estructurado_email_whatsapp_v1.md
 *
 * Agrega campos de contacto estructurado al modelo public.clients.
 * Columnas nullable para compatibilidad con clientes existentes.
 */

alter table public.clients
  add column if not exists primary_contact_email text,
  add column if not exists primary_contact_whatsapp text;
