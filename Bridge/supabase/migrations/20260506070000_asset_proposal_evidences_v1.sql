/*
 * IMPL-20260506-47
 * Respaldo: context/SPECs/SPEC_ARCH-20260506-47_activo_archivos_y_evidencias_reales.md
 *
 * Evidencias reales por propuesta de activo creativo.
 * Cierra el vacio "file_upload" del corte 46.
 *
 * Elementos:
 *   1. Bucket Supabase Storage "proposal-evidences" (privado, 50 MB max)
 *   2. Políticas de storage para service_role
 *   3. Tabla asset_proposal_evidences — referencia a cada archivo subido
 */

-- ─── 1. Bucket de almacenamiento ──────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proposal-evidences',
  'proposal-evidences',
  false,
  52428800,  -- 50 MB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'video/mp4', 'video/quicktime'
  ]
)
on conflict (id) do nothing;

-- ─── 2. Políticas de storage (service_role para upload/read/delete) ───────────

drop policy if exists "service_role_upload_proposal_evidences" on storage.objects;
create policy "service_role_upload_proposal_evidences"
on storage.objects for insert
to service_role
with check (bucket_id = 'proposal-evidences');

drop policy if exists "service_role_read_proposal_evidences" on storage.objects;
create policy "service_role_read_proposal_evidences"
on storage.objects for select
to service_role
using (bucket_id = 'proposal-evidences');

drop policy if exists "service_role_delete_proposal_evidences" on storage.objects;
create policy "service_role_delete_proposal_evidences"
on storage.objects for delete
to service_role
using (bucket_id = 'proposal-evidences');

-- ─── 3. Tabla de referencias a evidencias por propuesta ───────────────────────
--
-- Columnas:
--   tenant_id       — aislamiento multitenant
--   asset_id        — referencia directa al activo (para queries sin join)
--   proposal_id     — referencia a la propuesta a la que pertenece
--   file_name       — nombre original del archivo subido por el diseñador
--   mime_type       — tipo MIME detectado o declarado
--   storage_path    — ruta relativa dentro del bucket (tenant/asset/proposal/uuid.ext)
--   file_size_bytes — tamaño en bytes; nullable si no se pudo determinar
--   uploaded_at     — timestamp UTC de la carga

create table if not exists public.asset_proposal_evidences (
  id              uuid        primary key default gen_random_uuid(),
  tenant_id       uuid        not null references public.tenants(id) on delete cascade,
  asset_id        uuid        not null references public.assets(id) on delete cascade,
  proposal_id     uuid        not null references public.asset_proposals(id) on delete cascade,
  file_name       text        not null,
  mime_type       text        not null default 'application/octet-stream',
  storage_path    text        not null,
  file_size_bytes bigint,
  uploaded_at     timestamptz not null default timezone('utc'::text, now())
);

create index if not exists asset_proposal_evidences_proposal_idx
  on public.asset_proposal_evidences (proposal_id, uploaded_at desc);

create index if not exists asset_proposal_evidences_asset_idx
  on public.asset_proposal_evidences (asset_id, uploaded_at desc);

alter table public.asset_proposal_evidences enable row level security;

-- Lectura publica para tenants activos (consistente con el resto del schema)
drop policy if exists "Public read active tenant asset_proposal_evidences" on public.asset_proposal_evidences;
create policy "Public read active tenant asset_proposal_evidences"
on public.asset_proposal_evidences
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tenants
    where tenants.id = asset_proposal_evidences.tenant_id
      and tenants.status = 'active'
  )
);

-- Escritura exclusiva para service_role (upload via API servidor)
drop policy if exists "Service role write asset_proposal_evidences" on public.asset_proposal_evidences;
create policy "Service role write asset_proposal_evidences"
on public.asset_proposal_evidences
for all
to service_role
using (true)
with check (true);
