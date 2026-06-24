-- Stage 3a (renter onboarding redesign): renter_situation + employment/income/guarantor/visa columns.
-- Route remains derived on profile save (Stage 4); this migration only adds storage + student backfill.
-- Rob runs this — proceed?

-- ---------------------------------------------------------------------------
-- student_profiles — situation + route-specific fields
-- ---------------------------------------------------------------------------

alter table public.student_profiles
  add column if not exists renter_situation text
    check (
      renter_situation is null
      or renter_situation in (
        'student',
        'working',
        'working_holiday',
        'backpacker',
        'retired',
        'between_jobs'
      )
    );

comment on column public.student_profiles.renter_situation is
  'Renter life situation (section 0). student | working | working_holiday | backpacker | retired | between_jobs. Drives accommodation_verification_route on save.';

alter table public.student_profiles
  add column if not exists employment_status text,
  add column if not exists employer_name text,
  add column if not exists job_title text,
  add column if not exists employment_type text;

comment on column public.student_profiles.employer_name is
  'Canonical employer name (working route). Distinct from workplace_* geocode search anchor.';

alter table public.student_profiles
  add column if not exists income_band text,
  add column if not exists income_source text;

alter table public.student_profiles
  add column if not exists guarantor_relationship text,
  add column if not exists guarantor_phone text,
  add column if not exists guarantor_email text,
  add column if not exists guarantor_income_band text,
  add column if not exists guarantor_consent boolean;

comment on column public.student_profiles.guarantor_consent is
  'Checkbox attestation that guarantor consented; not a stored document.';

alter table public.student_profiles
  add column if not exists visa_status text,
  add column if not exists visa_subclass text,
  add column if not exists visa_expiry date,
  add column if not exists visa_doc_url text,
  add column if not exists visa_submitted_at timestamptz,
  add column if not exists visa_doc_name text;

comment on column public.student_profiles.visa_doc_url is
  'Visa document storage path (working holiday / backpacker routes); mirrors id/enrolment doc slot pattern.';

-- ---------------------------------------------------------------------------
-- Backfill: existing student-route renters keep section 0 complete without re-prompt.
-- non_student rows stay null — working vs retired etc. cannot be inferred from route alone.
-- ---------------------------------------------------------------------------

update public.student_profiles
set renter_situation = 'student'
where accommodation_verification_route = 'student'
  and renter_situation is null;
