-- Signup and onboarding trail: observation triggers on profile tables → journey_events.
-- Does not modify handle_new_user or auth/signup code. Rob applies before deploy.

-- ---------------------------------------------------------------------------
-- student_profiles: account creation
-- ---------------------------------------------------------------------------
create or replace function public.journey_log_student_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.journey_events (
      user_id,
      email,
      event_type,
      source,
      metadata
    )
    values (
      new.user_id,
      new.email,
      'signup_created',
      'database',
      jsonb_build_object(
        'role', 'student',
        'student_profile_id', new.id,
        'accommodation_verification_route', new.accommodation_verification_route
      )
    );
  exception
    when others then
      null;
  end;

  return new;
end;
$$;

drop trigger if exists journey_log_student_profile_insert on public.student_profiles;

create trigger journey_log_student_profile_insert
  after insert on public.student_profiles
  for each row
  execute function public.journey_log_student_profile_insert();

-- ---------------------------------------------------------------------------
-- landlord_profiles: account creation
-- ---------------------------------------------------------------------------
create or replace function public.journey_log_landlord_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    insert into public.journey_events (
      user_id,
      email,
      event_type,
      source,
      metadata
    )
    values (
      new.user_id,
      new.email,
      'signup_created',
      'database',
      jsonb_build_object(
        'role', 'landlord'
      )
    );
  exception
    when others then
      null;
  end;

  return new;
end;
$$;

drop trigger if exists journey_log_landlord_profile_insert on public.landlord_profiles;

create trigger journey_log_landlord_profile_insert
  after insert on public.landlord_profiles
  for each row
  execute function public.journey_log_landlord_profile_insert();

-- ---------------------------------------------------------------------------
-- student_profiles: route, verification, onboarding changes
-- ---------------------------------------------------------------------------
create or replace function public.journey_log_student_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.accommodation_verification_route is distinct from new.accommodation_verification_route then
    begin
      insert into public.journey_events (
        user_id,
        email,
        event_type,
        source,
        metadata
      )
      values (
        new.user_id,
        new.email,
        'route_set',
        'database',
        jsonb_build_object(
          'role', 'student',
          'student_profile_id', new.id,
          'accommodation_verification_route', new.accommodation_verification_route
        )
      );
    exception
      when others then
        null;
    end;
  end if;

  if old.verification_type is distinct from new.verification_type then
    begin
      insert into public.journey_events (
        user_id,
        email,
        event_type,
        source,
        metadata
      )
      values (
        new.user_id,
        new.email,
        'verification_set',
        'database',
        jsonb_build_object(
          'role', 'student',
          'student_profile_id', new.id,
          'verification_type', new.verification_type
        )
      );
    exception
      when others then
        null;
    end;
  end if;

  if old.onboarding_complete is distinct from new.onboarding_complete then
    begin
      insert into public.journey_events (
        user_id,
        email,
        event_type,
        source,
        metadata
      )
      values (
        new.user_id,
        new.email,
        'onboarding_completed',
        'database',
        jsonb_build_object(
          'role', 'student',
          'student_profile_id', new.id,
          'onboarding_complete', new.onboarding_complete
        )
      );
    exception
      when others then
        null;
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists journey_log_student_profile_update on public.student_profiles;

create trigger journey_log_student_profile_update
  after update on public.student_profiles
  for each row
  execute function public.journey_log_student_profile_update();
