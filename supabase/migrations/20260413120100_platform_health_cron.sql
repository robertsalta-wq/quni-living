-- Poll platform-health-cron every 5 minutes (UTC).
-- Vault: project_url (existing), platform_health_cron_secret (same as Edge secret PLATFORM_HEALTH_CRON_SECRET)
-- Deploy: supabase functions deploy platform-health-cron --no-verify-jwt

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  jid integer;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'platform_health_cron';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

SELECT cron.schedule(
  'platform_health_cron',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1)
      || '/functions/v1/platform-health-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'platform_health_cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  );
  $cron$
);
