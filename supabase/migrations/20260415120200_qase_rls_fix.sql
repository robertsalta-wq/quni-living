-- Qase RLS: submitted_by_id is student_profiles.id / landlord_profiles.id (profile PK), not auth.uid().
-- Fixes platform form + aligns owner policies with qase-inbound-email and QaseSubmitModal.

-- ---------------------------------------------------------------------------
-- qase_tickets
-- ---------------------------------------------------------------------------

drop policy if exists "Qase tickets authenticated insert" on public.qase_tickets;

create policy "Qase tickets authenticated insert"
  on public.qase_tickets for insert
  to authenticated
  with check (
    (
      submitted_by_id is null
      or public.is_platform_admin()
      or (
        submitted_by_type = 'student'
        and exists (
          select 1
          from public.student_profiles sp
          where sp.id = submitted_by_id
            and sp.user_id = auth.uid()
        )
      )
      or (
        submitted_by_type = 'landlord'
        and exists (
          select 1
          from public.landlord_profiles lp
          where lp.id = submitted_by_id
            and lp.user_id = auth.uid()
        )
      )
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

drop policy if exists "Qase tickets owners select" on public.qase_tickets;

create policy "Qase tickets owners select"
  on public.qase_tickets for select
  to authenticated
  using (
    (
      submitted_by_type = 'student'
      and exists (
        select 1
        from public.student_profiles sp
        where sp.id = submitted_by_id
          and sp.user_id = auth.uid()
      )
    )
    or (
      submitted_by_type = 'landlord'
      and exists (
        select 1
        from public.landlord_profiles lp
        where lp.id = submitted_by_id
          and lp.user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- qase_messages
-- ---------------------------------------------------------------------------

drop policy if exists "Qase messages owners select" on public.qase_messages;

create policy "Qase messages owners select"
  on public.qase_messages for select
  to authenticated
  using (
    not is_internal_note
    and exists (
      select 1
      from public.qase_tickets t
      where t.id = qase_messages.ticket_id
        and (
          (
            t.submitted_by_type = 'student'
            and exists (
              select 1
              from public.student_profiles sp
              where sp.id = t.submitted_by_id
                and sp.user_id = auth.uid()
            )
          )
          or (
            t.submitted_by_type = 'landlord'
            and exists (
              select 1
              from public.landlord_profiles lp
              where lp.id = t.submitted_by_id
                and lp.user_id = auth.uid()
            )
          )
        )
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

drop policy if exists "Qase messages owners insert public" on public.qase_messages;

create policy "Qase messages owners insert public"
  on public.qase_messages for insert
  to authenticated
  with check (
    is_internal_note = false
    and exists (
      select 1
      from public.qase_tickets t
      where t.id = qase_messages.ticket_id
        and (
          (
            t.submitted_by_type = 'student'
            and exists (
              select 1
              from public.student_profiles sp
              where sp.id = t.submitted_by_id
                and sp.user_id = auth.uid()
            )
          )
          or (
            t.submitted_by_type = 'landlord'
            and exists (
              select 1
              from public.landlord_profiles lp
              where lp.id = t.submitted_by_id
                and lp.user_id = auth.uid()
            )
          )
        )
    )
  );
