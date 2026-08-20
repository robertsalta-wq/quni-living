-- Ceiling fan amenity for QLD share-house listings.
-- `features.name` is unique text (not a Postgres enum). `property_features.feature_id`
-- is an FK to this lookup, so the row must exist before landlords can tick it.
-- Idempotent. Agents must not apply this to production. Rob runs this. Proceed?

insert into public.features (name)
values ('Ceiling fan')
on conflict (name) do nothing;
