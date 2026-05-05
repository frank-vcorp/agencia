/*
 * IMPL-20260505-02
 * Respaldo: context/MODELO_DATOS_MULTITENANT_V1.md, context/SPECs/SPEC_ARCH-20260504-04_bridge_v1_roles_base_y_flujos.md
 */

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status text not null default 'active' check (status in ('draft', 'active', 'inactive', 'archived')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.tenant_runtime_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  dashboard_headline text not null,
  dashboard_summary text not null,
  primary_contact_channel text,
  active_modules text[] not null default '{}',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.tenants enable row level security;
alter table public.tenant_runtime_settings enable row level security;

drop policy if exists "Public read active tenants" on public.tenants;
create policy "Public read active tenants"
on public.tenants
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "Public read active tenant runtime settings" on public.tenant_runtime_settings;
create policy "Public read active tenant runtime settings"
on public.tenant_runtime_settings
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = tenant_runtime_settings.tenant_id
      and tenants.status = 'active'
  )
);

drop trigger if exists set_tenants_updated_at on public.tenants;
create trigger set_tenants_updated_at
before update on public.tenants
for each row
execute function public.set_updated_at();

drop trigger if exists set_tenant_runtime_settings_updated_at on public.tenant_runtime_settings;
create trigger set_tenant_runtime_settings_updated_at
before update on public.tenant_runtime_settings
for each row
execute function public.set_updated_at();

insert into public.tenants (slug, name, status)
values ('vectoria', 'Vectoria', 'active')
on conflict (slug) do update
set
  name = excluded.name,
  status = excluded.status,
  updated_at = timezone('utc'::text, now());

insert into public.tenant_runtime_settings (
  tenant_id,
  dashboard_headline,
  dashboard_summary,
  primary_contact_channel,
  active_modules
)
select
  tenants.id,
  'Vectoria centraliza briefings, activos y cotizaciones desde un tenant real',
  'La superficie principal ya puede leer configuracion inicial desde Supabase y reflejar el contexto base del piloto.',
  'WhatsApp + correo operativo',
  array['briefs', 'cotizaciones', 'activos', 'crm', 'contexto-agentes']::text[]
from public.tenants
where tenants.slug = 'vectoria'
on conflict (tenant_id) do update
set
  dashboard_headline = excluded.dashboard_headline,
  dashboard_summary = excluded.dashboard_summary,
  primary_contact_channel = excluded.primary_contact_channel,
  active_modules = excluded.active_modules,
  updated_at = timezone('utc'::text, now());