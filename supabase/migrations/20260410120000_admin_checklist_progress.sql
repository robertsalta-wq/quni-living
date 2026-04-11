-- Admin-only checklist progress (e.g. trust checklist).
-- RLS: public.is_platform_admin() — keep in sync with supabase/admin_rls_policies.sql and src/lib/adminEmails.ts.

create table if not exists public.admin_checklist_progress (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  completed_items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists admin_checklist_progress_updated_at on public.admin_checklist_progress;
create trigger admin_checklist_progress_updated_at
  before update on public.admin_checklist_progress
  for each row execute function public.set_updated_at();

alter table public.admin_checklist_progress enable row level security;

drop policy if exists "Platform admins select checklist progress" on public.admin_checklist_progress;
drop policy if exists "Platform admins insert checklist progress" on public.admin_checklist_progress;
drop policy if exists "Platform admins update checklist progress" on public.admin_checklist_progress;
drop policy if exists "Platform admins delete checklist progress" on public.admin_checklist_progress;

create policy "Platform admins select checklist progress"
  on public.admin_checklist_progress for select
  to authenticated
  using (public.is_platform_admin());

create policy "Platform admins insert checklist progress"
  on public.admin_checklist_progress for insert
  to authenticated
  with check (public.is_platform_admin());

create policy "Platform admins update checklist progress"
  on public.admin_checklist_progress for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "Platform admins delete checklist progress"
  on public.admin_checklist_progress for delete
  to authenticated
  using (public.is_platform_admin());
