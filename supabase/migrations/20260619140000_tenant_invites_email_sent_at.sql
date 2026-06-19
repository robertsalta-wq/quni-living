-- Record when a tenant invite email was last sent successfully (Resend accept).
-- Delivery analytics (bounces/opens) remain out of scope — use Resend dashboard for that.

alter table public.tenant_invites
  add column if not exists email_sent_at timestamptz;

comment on column public.tenant_invites.email_sent_at is
  'Last successful platform email send for this invite (updated on each resend). Copy-link-only invites stay null.';
