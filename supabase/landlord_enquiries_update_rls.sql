-- Allow landlords to update enquiries on their listings (e.g. mark as read).
-- Run in SQL Editor after quni_supabase_schema.sql.

drop policy if exists "Landlords update enquiries for their properties" on public.enquiries;

create policy "Landlords update enquiries for their properties"
  on public.enquiries for update
  to authenticated
  using (
    landlord_id in (
      select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
    )
    or exists (
      select 1 from public.properties p
      where p.id = enquiries.property_id
        and p.landlord_id in (
          select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
        )
    )
  )
  with check (
    landlord_id in (
      select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
    )
    or exists (
      select 1 from public.properties p
      where p.id = enquiries.property_id
        and p.landlord_id in (
          select lp.id from public.landlord_profiles lp where lp.user_id = auth.uid()
        )
    )
  );
