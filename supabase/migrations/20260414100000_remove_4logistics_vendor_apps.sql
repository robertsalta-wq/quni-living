-- Remove legacy 4Logistics vendor rows from Admin → Apps (table uses subtitle, not description).
delete from public.admin_vendor_subscriptions
where title ilike '%4logistics%'
   or subtitle ilike '%4logistics%';
