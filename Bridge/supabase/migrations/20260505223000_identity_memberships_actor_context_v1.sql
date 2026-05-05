/*
 * IMPL-20260505-21
 * Respaldo: context/IDENTIDAD_Y_MEMBERSHIPS_V1.md, context/SPECs/SPEC_ARCH-20260505-21_memberships_users_y_actor_efectivo_v1.md, context/MODELO_DATOS_MULTITENANT_V1.md, context/CONTRATOS_AGENTES_Y_VSCODE_V1.md
 */

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  display_name text not null,
  email text not null unique,
  user_type text not null check (user_type in ('operator', 'designer', 'client', 'internal_admin')),
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('operator', 'designer', 'client_admin', 'client_viewer')),
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (tenant_id, user_id)
);

create table if not exists public.service_agents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  name text not null,
  agent_type text not null check (agent_type in ('vscode_operator_agent', 'briefing_agent', 'integration_agent', 'automation_agent')),
  auth_mode text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.agent_scopes (
  id uuid primary key default gen_random_uuid(),
  service_agent_id uuid not null references public.service_agents(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  resource_type text not null,
  operation text not null,
  approval_required boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (service_agent_id, tenant_id, resource_type, operation)
);

create index if not exists tenant_memberships_tenant_role_idx on public.tenant_memberships (tenant_id, role, status);
create index if not exists service_agents_tenant_idx on public.service_agents (tenant_id, agent_type, status);
create index if not exists agent_scopes_tenant_resource_idx on public.agent_scopes (tenant_id, resource_type, operation);

alter table public.users enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.service_agents enable row level security;
alter table public.agent_scopes enable row level security;

drop policy if exists "Public read active tenant users" on public.users;
create policy "Public read active tenant users"
on public.users
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tenant_memberships
    join public.tenants on tenants.id = tenant_memberships.tenant_id
    where tenant_memberships.user_id = users.id
      and tenant_memberships.status = 'active'
      and tenants.status = 'active'
  )
);

drop policy if exists "Public read active tenant memberships" on public.tenant_memberships;
create policy "Public read active tenant memberships"
on public.tenant_memberships
for select
to anon, authenticated
using (
  status = 'active'
  and exists (
    select 1
    from public.tenants
    where tenants.id = tenant_memberships.tenant_id
      and tenants.status = 'active'
  )
);

drop policy if exists "Public read active service agents" on public.service_agents;
create policy "Public read active service agents"
on public.service_agents
for select
to anon, authenticated
using (
  status = 'active'
  and (
    tenant_id is null
    or exists (
      select 1
      from public.tenants
      where tenants.id = service_agents.tenant_id
        and tenants.status = 'active'
    )
  )
);

drop policy if exists "Public read active agent scopes" on public.agent_scopes;
create policy "Public read active agent scopes"
on public.agent_scopes
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = agent_scopes.tenant_id
      and tenants.status = 'active'
  )
);

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists set_tenant_memberships_updated_at on public.tenant_memberships;
create trigger set_tenant_memberships_updated_at
before update on public.tenant_memberships
for each row
execute function public.set_updated_at();

drop trigger if exists set_service_agents_updated_at on public.service_agents;
create trigger set_service_agents_updated_at
before update on public.service_agents
for each row
execute function public.set_updated_at();

alter table public.brief_messages
  add column if not exists actor_user_id uuid references public.users(id) on delete set null,
  add column if not exists actor_membership_id uuid references public.tenant_memberships(id) on delete set null,
  add column if not exists actor_agent_id uuid references public.service_agents(id) on delete set null,
  add column if not exists effective_user_id uuid references public.users(id) on delete set null,
  add column if not exists effective_membership_id uuid references public.tenant_memberships(id) on delete set null;

alter table public.brief_review_events
  add column if not exists actor_user_id uuid references public.users(id) on delete set null,
  add column if not exists actor_membership_id uuid references public.tenant_memberships(id) on delete set null,
  add column if not exists actor_agent_id uuid references public.service_agents(id) on delete set null,
  add column if not exists effective_user_id uuid references public.users(id) on delete set null,
  add column if not exists effective_membership_id uuid references public.tenant_memberships(id) on delete set null;

create index if not exists brief_messages_effective_membership_idx on public.brief_messages (effective_membership_id, created_at desc);
create index if not exists brief_review_events_effective_membership_idx on public.brief_review_events (effective_membership_id, created_at desc);

insert into public.users (display_name, email, user_type, status)
values
  ('Vectoria Operaciones', 'operador@vectoria.demo', 'operator', 'active'),
  ('Vectoria Diseno', 'disenador@vectoria.demo', 'designer', 'active'),
  ('Cliente Vectoria Demo', 'cliente@vectoria.demo', 'client', 'active')
on conflict (email) do update
set
  display_name = excluded.display_name,
  user_type = excluded.user_type,
  status = excluded.status,
  updated_at = timezone('utc'::text, now());

insert into public.tenant_memberships (tenant_id, user_id, role, status)
select
  tenants.id,
  users.id,
  seed.role,
  'active'
from public.tenants
join (
  values
    ('operador@vectoria.demo', 'operator'),
    ('disenador@vectoria.demo', 'designer'),
    ('cliente@vectoria.demo', 'client_admin')
) as seed(email, role) on true
join public.users on users.email = seed.email
where tenants.slug = 'vectoria'
on conflict (tenant_id, user_id) do update
set
  role = excluded.role,
  status = excluded.status,
  updated_at = timezone('utc'::text, now());

insert into public.service_agents (tenant_id, name, agent_type, auth_mode, status)
select
  tenants.id,
  'Bridge VS Code Operator',
  'vscode_operator_agent',
  'service_role',
  'active'
from public.tenants
where tenants.slug = 'vectoria'
on conflict do nothing;

insert into public.agent_scopes (service_agent_id, tenant_id, resource_type, operation, approval_required)
select
  service_agents.id,
  tenants.id,
  'briefing',
  'persist_and_route',
  true
from public.tenants
join public.service_agents on service_agents.tenant_id = tenants.id
where tenants.slug = 'vectoria'
  and service_agents.agent_type = 'vscode_operator_agent'
  and service_agents.name = 'Bridge VS Code Operator'
on conflict (service_agent_id, tenant_id, resource_type, operation) do update
set
  approval_required = excluded.approval_required;