alter table public.admin_vendor_subscriptions
  add column if not exists account_email text,
  add column if not exists account_entity text check (account_entity in ('quni', '4logistics', 'personal')),
  add column if not exists encrypted_password text,
  add column if not exists twofa_enabled boolean default false,
  add column if not exists twofa_method text,
  add column if not exists recovery_location text,
  add column if not exists api_key_notes text,
  add column if not exists connected_to text,
  add column if not exists cred_notes text;
