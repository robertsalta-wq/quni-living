-- Optional columns for landlord property form (linen / cleaning checkboxes).
-- Run in Supabase SQL Editor if your project was created before this file existed.

alter table public.properties
  add column if not exists linen_supplied boolean default false;

alter table public.properties
  add column if not exists weekly_cleaning_service boolean default false;
