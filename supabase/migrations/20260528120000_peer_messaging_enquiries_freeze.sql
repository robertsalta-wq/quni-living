-- Peer messaging chunk 6: stop new rows on legacy enquiries (conversations are canonical).

drop policy if exists "Enquiries allowed for visible listings" on public.enquiries;
drop policy if exists "Anyone can create an enquiry" on public.enquiries;

revoke insert on public.enquiries from authenticated;
revoke insert on public.enquiries from anon;

comment on table public.enquiries is
  'Legacy property enquiries — frozen at peer messaging cutover. New tenant–landlord chat uses conversations / conversation_messages. Historical rows remain readable; backfill ran in 20260527120000_peer_messaging.sql (M11).';
