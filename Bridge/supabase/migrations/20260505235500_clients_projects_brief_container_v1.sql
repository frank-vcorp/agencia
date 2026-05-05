/*
 * IMPL-20260505-22
 * Respaldo: context/CLIENTS_Y_PROJECTS_V1.md, context/SPECs/SPEC_ARCH-20260505-22_clients_y_projects_v1.md, context/MODELO_DATOS_MULTITENANT_V1.md, context/SPECs/SPEC_ARCH-20260505-21_memberships_users_y_actor_efectivo_v1.md
 */

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  legal_name text,
  status text not null default 'active' check (status in ('active', 'prospect', 'inactive')),
  primary_contact_name text,
  primary_contact_channel text,
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (tenant_id, name)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  project_type text not null check (project_type in ('lanzamiento', 'presencia', 'contenido', 'campana', 'interno')),
  name text not null,
  objective text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed', 'archived')),
  owner_membership_id uuid references public.tenant_memberships(id) on delete set null,
  start_date date,
  end_date date,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (tenant_id, client_id, name)
);

alter table public.briefs
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists project_id uuid references public.projects(id) on delete set null;

create index if not exists clients_tenant_status_idx on public.clients (tenant_id, status, created_at desc);
create index if not exists projects_tenant_status_idx on public.projects (tenant_id, status, created_at desc);
create index if not exists projects_client_idx on public.projects (client_id, created_at desc);
create index if not exists briefs_client_project_idx on public.briefs (tenant_id, client_id, project_id, updated_at desc);

alter table public.clients enable row level security;
alter table public.projects enable row level security;

drop policy if exists "Public read active tenant clients" on public.clients;
create policy "Public read active tenant clients"
on public.clients
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = clients.tenant_id
      and tenants.status = 'active'
  )
);

drop policy if exists "Public read active tenant projects" on public.projects;
create policy "Public read active tenant projects"
on public.projects
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = projects.tenant_id
      and tenants.status = 'active'
  )
);

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
before update on public.clients
for each row
execute function public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

insert into public.clients (tenant_id, name, legal_name, status, primary_contact_name, primary_contact_channel, notes)
select
  tenants.id,
  'Cliente demo controlado Vectoria',
  'Vectoria Demo Controlado',
  'active',
  'Equipo Vectoria Demo',
  'WhatsApp demo controlado',
  'Contenedor demo inicial para briefs, cotizaciones y activos del piloto.'
from public.tenants
where tenants.slug = 'vectoria'
on conflict (tenant_id, name) do update
set
  legal_name = excluded.legal_name,
  status = excluded.status,
  primary_contact_name = excluded.primary_contact_name,
  primary_contact_channel = excluded.primary_contact_channel,
  notes = excluded.notes,
  updated_at = timezone('utc'::text, now());

insert into public.projects (tenant_id, client_id, project_type, name, objective, status, owner_membership_id, start_date, end_date)
select
  tenants.id,
  clients.id,
  'lanzamiento',
  'Proyecto demo controlado Vectoria',
  'Contenedor operativo inicial para el piloto y el briefing persistido.',
  'active',
  memberships.id,
  current_date,
  null
from public.tenants
join public.clients on clients.tenant_id = tenants.id and clients.name = 'Cliente demo controlado Vectoria'
left join lateral (
  select tenant_memberships.id
  from public.tenant_memberships
  where tenant_memberships.tenant_id = tenants.id
    and tenant_memberships.role = 'operator'
    and tenant_memberships.status = 'active'
  order by tenant_memberships.created_at asc
  limit 1
) as memberships on true
where tenants.slug = 'vectoria'
on conflict (tenant_id, client_id, name) do update
set
  project_type = excluded.project_type,
  objective = excluded.objective,
  status = excluded.status,
  owner_membership_id = coalesce(excluded.owner_membership_id, projects.owner_membership_id),
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  updated_at = timezone('utc'::text, now());

update public.briefs
set
  client_id = coalesce(public.briefs.client_id, seeded.client_id),
  project_id = coalesce(public.briefs.project_id, seeded.project_id),
  updated_at = timezone('utc'::text, now())
from (
  select
    tenants.id as tenant_id,
    clients.id as client_id,
    projects.id as project_id
  from public.tenants
  join public.clients on clients.tenant_id = tenants.id and clients.name = 'Cliente demo controlado Vectoria'
  join public.projects on projects.tenant_id = tenants.id and projects.client_id = clients.id and projects.name = 'Proyecto demo controlado Vectoria'
  where tenants.slug = 'vectoria'
) as seeded
where public.briefs.tenant_id = seeded.tenant_id
  and (public.briefs.client_id is null or public.briefs.project_id is null);