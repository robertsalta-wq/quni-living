-- Daily TPP domain expiry emails (8:00 AEST ≈ 22:00 UTC when NSW/Vic use standard time UTC+10).
-- Prerequisites (Supabase Dashboard → Project Settings → Vault, or SQL):
--   select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
--   select vault.create_secret('same_value_as_edge_secret_TPP_DOMAIN_CRON_SECRET', 'tpp_domain_cron_secret');
-- Edge Function secrets: TPP_API_*, RESEND_API_KEY, TPP_DOMAIN_CRON_SECRET
-- Deploy: supabase functions deploy tpp-domain-expiry-alert --no-verify-jwt

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  jid integer;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'tpp_domain_expiry_alert';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'tpp_domain_expiry_alert',
  '0 22 * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1)
      || '/functions/v1/tpp-domain-expiry-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'tpp_domain_cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $cron$
);
