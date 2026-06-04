-- Clear legacy listing_type on active properties; property_type is the source of truth.
update public.properties
set listing_type = null
where title in (
  'Cosy private room in Ryde',
  'Renovated home with sweeping views'
);
