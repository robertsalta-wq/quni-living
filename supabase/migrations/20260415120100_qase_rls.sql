-- Qase row-level security.
--
-- Edge Functions and server jobs that use the Supabase **service_role** API key
-- bypass RLS. Inbound email and other automations must use that key — never the
-- anon or end-user JWT for privileged writes.
--
-- The **anon** role has no policies on qase_* tables here, so anonymous clients
-- have no direct SQL access to these tables.
--
-- Platform admins: public.is_platform_admin() (JWT email; see supabase/admin_rls_policies.sql).
-- Student/landlord session checks use student_profiles.user_id / landlord_profiles.user_id (= auth.uid()).

alter table public.qase_tickets enable row level security;
alter table public.qase_messages enable row level security;
alter table public.qase_fields enable row level security;

drop policy if exists "Qase tickets admins all" on public.qase_tickets;
drop policy if exists "Qase tickets owners select" on public.qase_tickets;
drop policy if exists "Qase tickets authenticated insert" on public.qase_tickets;

create policy "Qase tickets admins all"
  on public.qase_tickets for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "Qase tickets owners select"
  on public.qase_tickets for select
  to authenticated
  using (
    submitted_by_id = auth.uid()
    and (
      exists (
        select 1
        from public.student_profiles sp
        where sp.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.landlord_profiles lp
        where lp.user_id = auth.uid()
      )
    )
  );

create policy "Qase tickets authenticated insert"
  on public.qase_tickets for insert
  to authenticated
  with check (
    (
      submitted_by_id = auth.uid()
      or submitted_by_id is null
    )
    and (
      public.is_platform_admin()
      or exists (
        select 1
        from public.student_profiles sp
        where sp.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.landlord_profiles lp
        where lp.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Qase messages admins all" on public.qase_messages;
drop policy if exists "Qase messages owners select" on public.qase_messages;
drop policy if exists "Qase messages owners insert public" on public.qase_messages;

create policy "Qase messages admins all"
  on public.qase_messages for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "Qase messages owners select"
  on public.qase_messages for select
  to authenticated
  using (
    not is_internal_note
    and exists (
      select 1
      from public.qase_tickets t
      where t.id = qase_messages.ticket_id
        and t.submitted_by_id = auth.uid()
    )
    and (
      exists (
        select 1
        from public.student_profiles sp
        where sp.user_id = auth.uid()
      )
      or exists (
        select 1
        from public.landlord_profiles lp
        where lp.user_id = auth.uid()
      )
    )
  );

create policy "Qase messages owners insert public"
  on public.qase_messages for insert
  to authenticated
  with check (
    is_internal_note = false
    and exists (
      select 1
      from public.qase_tickets t
      where t.id = qase_messages.ticket_id
        and t.submitted_by_id = auth.uid()
    )
  );

drop policy if exists "Qase fields authenticated select" on public.qase_fields;
drop policy if exists "Qase fields admins manage" on public.qase_fields;

create policy "Qase fields authenticated select"
  on public.qase_fields for select
  to authenticated
  using (true);

create policy "Qase fields admins manage"
  on public.qase_fields for all
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());
