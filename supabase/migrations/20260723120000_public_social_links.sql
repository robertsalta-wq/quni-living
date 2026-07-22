-- Persist admin social media accounts in platform_config and expose Active links publicly.

insert into public.platform_config (config_key, config_value, label, category, is_sensitive, sort_order)
values (
  'social.accounts',
  $json$[
  {"platform":"TikTok","type":"Brand","handle":"@quniliving","url":"https://tiktok.com/@quniliving","status":"Active"},
  {"platform":"TikTok","type":"Personal","handle":"@quinnleeau","url":"https://tiktok.com/@quinnleeau","status":"Not created"},
  {"platform":"Instagram","type":"Brand","handle":"@quniliving","url":"https://instagram.com/quniliving","status":"Not created"},
  {"platform":"Instagram","type":"Personal","handle":"@quinnleeau","url":"https://instagram.com/quinnleeau","status":"Not created"},
  {"platform":"LinkedIn","type":"Company","handle":"Quni Living","url":"https://linkedin.com/company/quniliving","status":"Not created"},
  {"platform":"LinkedIn","type":"Personal","handle":"Quinn Lee","url":"https://linkedin.com/in/quinnleeau","status":"Not created"},
  {"platform":"Facebook","type":"Brand","handle":"Quni Living","url":"https://facebook.com/quniliving","status":"Not created"},
  {"platform":"YouTube","type":"Brand","handle":"@quniliving","url":"https://youtube.com/@quniliving","status":"Not created"},
  {"platform":"Twitter/X","type":"Brand","handle":"@quniliving","url":"https://x.com/quniliving","status":"Not created"}
]$json$,
  'Social media accounts (JSON)',
  'social',
  false,
  50
)
on conflict (config_key) do nothing;

create or replace view public.public_social_links
with (security_invoker = false)
as
select
  coalesce(
    (
      select pc.config_value
      from public.platform_config pc
      where pc.config_key = 'social.accounts'
      limit 1
    ),
    '[]'
  ) as accounts_json;

comment on view public.public_social_links is
  'Public read surface for social.accounts JSON (Admin Settings → Social media). Client filters Active Brand/Company URLs.';

grant select on public.public_social_links to anon, authenticated;
