-- Add landlord reply fields to enquiries (safe to re-run).
-- Run in Supabase SQL Editor after quni_supabase_schema.sql.

alter table public.enquiries
  add column if not exists reply text;

alter table public.enquiries
  add column if not exists replied_at timestamptz;
