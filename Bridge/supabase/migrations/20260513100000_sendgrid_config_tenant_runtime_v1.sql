/*
 * IMPL-20260513-05
 * Respaldo: context/SPECs/SPEC_ARCH-20260513-05_configuracion_sendgrid_segura_v1.md
 *
 * Extiende tenant_runtime_settings con parámetros no secretos de SendGrid.
 * SENDGRID_API_KEY NO se almacena aquí — sigue en secretos de plataforma.
 */

alter table public.tenant_runtime_settings
  add column if not exists sendgrid_from_email     text null,
  add column if not exists sendgrid_agency_name    text null,
  add column if not exists sendgrid_reply_to_email text null;
