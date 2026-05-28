/*
 * IMPL-20260528-01
 * Respaldo: context/SPECs/SPEC_ARCH-20260528-02_brand_kit_cliente_bridge_v1.md
 *
 * Brand Kit por cliente: columna jsonb y bucket publico de logos.
 */

alter table public.clients
  add column if not exists brand_kit jsonb default null;

insert into storage.buckets (id, name, public)
values ('brand-kits', 'brand-kits', true)
on conflict (id) do nothing;

drop policy if exists "public_read_brand_kits" on storage.objects;
create policy "public_read_brand_kits"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'brand-kits');

drop policy if exists "service_role_write_brand_kits" on storage.objects;
create policy "service_role_write_brand_kits"
on storage.objects for insert
to service_role
with check (bucket_id = 'brand-kits');

drop policy if exists "service_role_delete_brand_kits" on storage.objects;
create policy "service_role_delete_brand_kits"
on storage.objects for delete
to service_role
using (bucket_id = 'brand-kits');
