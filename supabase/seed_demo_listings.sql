-- ============================================================
-- Optional demo listings with sample photo URLs (Unsplash CDN)
-- Run in Supabase → SQL Editor AFTER:
--   - quni_supabase_schema.sql (or equivalent), and
--   - at least one row in landlord_profiles
-- If no landlord exists yet, this inserts nothing (no error).
-- Photos: royalty-free via Unsplash License (https://unsplash.com/license) — demo only.
-- ============================================================

insert into public.properties (
  title,
  slug,
  description,
  rent_per_week,
  room_type,
  listing_type,
  furnished,
  bedrooms,
  bathrooms,
  address,
  suburb,
  state,
  postcode,
  images,
  landlord_id,
  university_id,
  status,
  featured
)
select
  v.title,
  v.slug,
  v.description,
  v.rent,
  v.room_type,
  v.listing_type,
  v.furnished,
  v.bedrooms,
  v.bathrooms,
  v.address,
  v.suburb,
  v.state,
  v.postcode,
  v.images,
  lp.id,
  u.id,
  'active',
  v.featured
from (
  values
    (
      'Bright studio near campus',
      'demo-bright-studio-glebe',
      'Quiet street, short walk to uni. NBN WiFi, built-in wardrobe, own kitchenette.',
      320.00,
      'studio'::text,
      'rent'::text,
      true,
      1,
      1,
      '120 Glebe Point Rd'::text,
      'Glebe'::text,
      'NSW'::text,
      '2037'::text,
      true,
      array[
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&w=1200&q=80',
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&w=1200&q=80',
        'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&w=1200&q=80'
      ]::text[]
    ),
    (
      'Shared room — student house',
      'demo-shared-kingsford',
      'Friendly share house, large common areas, bills split evenly. 10 min walk to UNSW.',
      220.00,
      'shared'::text,
      'student_house'::text,
      false,
      1,
      1,
      '45 Barker St'::text,
      'Kingsford'::text,
      'NSW'::text,
      '2032'::text,
      false,
      array[
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&w=1200&q=80',
        'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&w=1200&q=80',
        'https://images.unsplash.com/photo-1560185007-cde436e6a53a?auto=format&w=1200&q=80'
      ]::text[]
    ),
    (
      '1-bed apartment — UTS area',
      'demo-apartment-ultimo',
      'Modern building, fully furnished, balcony with city glimpses. Secure intercom.',
      450.00,
      'apartment'::text,
      'rent'::text,
      true,
      1,
      1,
      '8 Jones St'::text,
      'Ultimo'::text,
      'NSW'::text,
      '2007'::text,
      true,
      array[
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&w=1200&q=80',
        'https://images.unsplash.com/photo-1567768450291-f088933aef7f?auto=format&w=1200&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&w=1200&q=80'
      ]::text[]
    ),
    (
      'Spacious student house — 5 bedrooms',
      'demo-house-camperdown',
      'Whole-house rental ideal for a group. Backyard, laundry, street parking.',
      980.00,
      'house'::text,
      'student_house'::text,
      true,
      5,
      2,
      '22 Australia St'::text,
      'Camperdown'::text,
      'NSW'::text,
      '2050'::text,
      false,
      array[
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&w=1200&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&w=1200&q=80',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&w=1200&q=80',
        'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&w=1200&q=80'
      ]::text[]
    ),
    (
      'Private room in modern flat',
      'demo-single-redfern',
      'Lockable room in 3-bed flat near Redfern station. Shared kitchen and lounge.',
      285.00,
      'single'::text,
      'rent'::text,
      true,
      1,
      1,
      '77 Redfern St'::text,
      'Redfern'::text,
      'NSW'::text,
      '2016'::text,
      false,
      array[
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&w=1200&q=80',
        'https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&w=1200&q=80',
        'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&w=1200&q=80'
      ]::text[]
    )
) as v (
  title,
  slug,
  description,
  rent,
  room_type,
  listing_type,
  furnished,
  bedrooms,
  bathrooms,
  address,
  suburb,
  state,
  postcode,
  featured,
  images
)
cross join lateral (select id from public.landlord_profiles limit 1) lp
cross join lateral (select id from public.universities order by name limit 1) u
where exists (select 1 from public.landlord_profiles limit 1)
on conflict (slug) do nothing;
