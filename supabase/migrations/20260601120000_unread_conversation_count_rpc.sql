-- Fast unread badge for header (avoids loading all conversation rows client-side).

create or replace function public.count_unread_conversations_for_user(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.conversations c
  where (
      c.tenant_user_id = p_user_id
      or c.landlord_user_id = p_user_id
    )
    and c.last_message_at is not null
    and (
      (
        c.landlord_user_id = p_user_id
        and (
          c.landlord_last_read_at is null
          or c.last_message_at > c.landlord_last_read_at
        )
      )
      or (
        c.tenant_user_id = p_user_id
        and (
          c.tenant_last_read_at is null
          or c.last_message_at > c.tenant_last_read_at
        )
      )
    );
$$;

revoke all on function public.count_unread_conversations_for_user(uuid) from public;
grant execute on function public.count_unread_conversations_for_user(uuid) to authenticated;
