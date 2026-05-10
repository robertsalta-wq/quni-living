-- Optional ACN and director name for legal identification on generated documents (admin-editable).

insert into public.platform_config (config_key, config_value, label, category, is_sensitive, sort_order)
values
  ('business.acn', '', 'ACN (if applicable)', 'business', false, 31),
  ('business.director_name', '', 'Director named on documents', 'business', false, 32)
on conflict (config_key) do nothing;
