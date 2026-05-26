-- Messaging APIs (POST /api/conversations/message, read) use the Supabase service_role
-- client. conversations_guard_participant_update() treated auth.uid() as the caller, so
-- last_message_* updates failed after a successful message insert → 500 "Could not send message".

create or replace function public.conversations_guard_participant_update()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;

  if public.is_platform_admin() then
    return new;
  end if;

  if not (
    old.landlord_user_id = auth.uid()
    or old.tenant_user_id = auth.uid()
  ) then
    raise exception 'Not a conversation participant';
  end if;

  if to_jsonb(new) - 'landlord_last_read_at' - 'tenant_last_read_at'
     is distinct from to_jsonb(old) - 'landlord_last_read_at' - 'tenant_last_read_at' then
    raise exception 'Participants may only update read timestamps';
  end if;

  return new;
end;
$$;

comment on function public.conversations_guard_participant_update() is
  'Participants may only bump read timestamps; service_role and platform admins may update other fields (messaging APIs).';
