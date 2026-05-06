/*
 * IMPL-20260505-26
 * Respaldo: context/SPECs/SPEC_ARCH-20260505-26_crm_ligero_operativo_y_seguimiento_minimo_v1.md
 */

create table if not exists public.leads (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  client_id           uuid references public.clients(id) on delete set null,
  project_id          uuid references public.projects(id) on delete set null,
  name                text not null,
  source_channel      text not null default 'directo'
    check (source_channel in ('directo', 'instagram', 'whatsapp', 'facebook', 'referido', 'sitio_web', 'otro')),
  requested_service   text not null default '',
  status              text not null default 'nuevo'
    check (status in ('nuevo', 'en_seguimiento', 'propuesta_enviada', 'cerrado_ganado', 'cerrado_perdido')),
  next_follow_up_at   timestamptz,
  created_at          timestamptz not null default timezone('utc'::text, now()),
  updated_at          timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.lead_notes (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  lead_id     uuid not null references public.leads(id) on delete cascade,
  note_text   text not null,
  created_at  timestamptz not null default timezone('utc'::text, now())
);

create index if not exists leads_tenant_status_idx
  on public.leads (tenant_id, status, created_at desc);

create index if not exists lead_notes_lead_idx
  on public.lead_notes (lead_id, created_at desc);

alter table public.leads enable row level security;
alter table public.lead_notes enable row level security;

drop policy if exists "Public read tenant leads" on public.leads;
create policy "Public read tenant leads"
on public.leads
for select
to anon, authenticated
using (
  exists (
    select 1 from public.tenants t
    where t.id = leads.tenant_id
      and t.status = 'active'
  )
);

drop policy if exists "Public insert tenant leads" on public.leads;
create policy "Public insert tenant leads"
on public.leads
for insert
to anon, authenticated
with check (
  exists (
    select 1 from public.tenants t
    where t.id = leads.tenant_id
      and t.status = 'active'
  )
);

drop policy if exists "Public update tenant leads" on public.leads;
create policy "Public update tenant leads"
on public.leads
for update
to anon, authenticated
using (
  exists (
    select 1 from public.tenants t
    where t.id = leads.tenant_id
      and t.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.tenants t
    where t.id = leads.tenant_id
      and t.status = 'active'
  )
);

drop policy if exists "Public read tenant lead_notes" on public.lead_notes;
create policy "Public read tenant lead_notes"
on public.lead_notes
for select
to anon, authenticated
using (
  exists (
    select 1 from public.tenants t
    where t.id = lead_notes.tenant_id
      and t.status = 'active'
  )
);

drop policy if exists "Public insert tenant lead_notes" on public.lead_notes;
create policy "Public insert tenant lead_notes"
on public.lead_notes
for insert
to anon, authenticated
with check (
  exists (
    select 1 from public.tenants t
    where t.id = lead_notes.tenant_id
      and t.status = 'active'
  )
);
