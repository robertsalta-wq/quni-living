-- ============================================================
-- Universities + campuses reference data (Australia)
-- Run in Supabase SQL Editor after quni_supabase_schema (or bootstrap).
-- Fixes: slug (required) vs short_name, campus suburb/state, FK-safe clear.
-- ============================================================

-- Part 2 — columns expected by app / seed
alter table public.universities add column if not exists short_name text;
alter table public.campuses add column if not exists suburb text;
alter table public.campuses add column if not exists state text;
alter table public.campuses add column if not exists slug text;

alter table public.student_profiles add column if not exists campus_id uuid references public.campuses (id) on delete set null;
alter table public.properties add column if not exists campus_id uuid references public.campuses (id) on delete set null;

-- Idempotent seed: safe to re-run without creating duplicates or clearing relations.

-- Universities: slug is NOT NULL UNIQUE — use unique slug per row (ACU has multiple campuses)
insert into public.universities (id, name, slug, short_name, state, city) values
-- NSW
('11111111-0000-0000-0000-000000000001', 'University of Sydney', 'usyd', 'USYD', 'NSW', 'Sydney'),
('11111111-0000-0000-0000-000000000002', 'University of New South Wales', 'unsw', 'UNSW', 'NSW', 'Sydney'),
('11111111-0000-0000-0000-000000000003', 'University of Technology Sydney', 'uts', 'UTS', 'NSW', 'Sydney'),
('11111111-0000-0000-0000-000000000004', 'Macquarie University', 'mq', 'MQ', 'NSW', 'Sydney'),
('11111111-0000-0000-0000-000000000005', 'Western Sydney University', 'wsu', 'WSU', 'NSW', 'Sydney'),
('11111111-0000-0000-0000-000000000006', 'Australian Catholic University', 'acu-nsw', 'ACU', 'NSW', 'Sydney'),
('11111111-0000-0000-0000-000000000007', 'University of Newcastle', 'uon', 'UON', 'NSW', 'Newcastle'),
('11111111-0000-0000-0000-000000000008', 'University of Wollongong', 'uow', 'UOW', 'NSW', 'Wollongong'),
('11111111-0000-0000-0000-000000000009', 'Southern Cross University', 'scu', 'SCU', 'NSW', 'Lismore'),
('11111111-0000-0000-0000-000000000010', 'Charles Sturt University', 'csu', 'CSU', 'NSW', 'Bathurst'),
-- VIC
('11111111-0000-0000-0000-000000000011', 'University of Melbourne', 'unimelb', 'UNIMELB', 'VIC', 'Melbourne'),
('11111111-0000-0000-0000-000000000012', 'Monash University', 'monash', 'MONASH', 'VIC', 'Melbourne'),
('11111111-0000-0000-0000-000000000013', 'RMIT University', 'rmit', 'RMIT', 'VIC', 'Melbourne'),
('11111111-0000-0000-0000-000000000014', 'Deakin University', 'deakin', 'DEAKIN', 'VIC', 'Melbourne'),
('11111111-0000-0000-0000-000000000015', 'La Trobe University', 'latrobe', 'LATROBE', 'VIC', 'Melbourne'),
('11111111-0000-0000-0000-000000000016', 'Swinburne University', 'swinburne', 'SWINBURNE', 'VIC', 'Melbourne'),
('11111111-0000-0000-0000-000000000017', 'Victoria University', 'vu', 'VU', 'VIC', 'Melbourne'),
('11111111-0000-0000-0000-000000000018', 'Australian Catholic University', 'acu-vic', 'ACU', 'VIC', 'Melbourne'),
('11111111-0000-0000-0000-000000000019', 'Federation University', 'feduni', 'FEDUNI', 'VIC', 'Ballarat'),
-- QLD
('11111111-0000-0000-0000-000000000020', 'University of Queensland', 'uq', 'UQ', 'QLD', 'Brisbane'),
('11111111-0000-0000-0000-000000000021', 'Queensland University of Technology', 'qut', 'QUT', 'QLD', 'Brisbane'),
('11111111-0000-0000-0000-000000000022', 'Griffith University', 'griffith', 'GRIFFITH', 'QLD', 'Brisbane'),
('11111111-0000-0000-0000-000000000023', 'James Cook University', 'jcu', 'JCU', 'QLD', 'Townsville'),
('11111111-0000-0000-0000-000000000024', 'University of Southern Queensland', 'usq', 'USQ', 'QLD', 'Toowoomba'),
('11111111-0000-0000-0000-000000000025', 'Bond University', 'bond', 'BOND', 'QLD', 'Gold Coast'),
('11111111-0000-0000-0000-000000000026', 'Central Queensland University', 'cqu', 'CQU', 'QLD', 'Rockhampton'),
('11111111-0000-0000-0000-000000000027', 'Australian Catholic University', 'acu-qld', 'ACU', 'QLD', 'Brisbane'),
-- WA
('11111111-0000-0000-0000-000000000028', 'University of Western Australia', 'uwa', 'UWA', 'WA', 'Perth'),
('11111111-0000-0000-0000-000000000029', 'Curtin University', 'curtin', 'CURTIN', 'WA', 'Perth'),
('11111111-0000-0000-0000-000000000030', 'Murdoch University', 'murdoch', 'MURDOCH', 'WA', 'Perth'),
('11111111-0000-0000-0000-000000000031', 'Edith Cowan University', 'ecu', 'ECU', 'WA', 'Perth'),
('11111111-0000-0000-0000-000000000032', 'Notre Dame University', 'unda-wa', 'UNDA', 'WA', 'Perth'),
-- SA
('11111111-0000-0000-0000-000000000033', 'University of Adelaide', 'uoadelaide', 'UOFA', 'SA', 'Adelaide'),
('11111111-0000-0000-0000-000000000034', 'University of South Australia', 'unisa', 'UNISA', 'SA', 'Adelaide'),
('11111111-0000-0000-0000-000000000035', 'Flinders University', 'flinders', 'FLINDERS', 'SA', 'Adelaide'),
('11111111-0000-0000-0000-000000000036', 'Australian Catholic University', 'acu-sa', 'ACU', 'SA', 'Adelaide'),
-- ACT
('11111111-0000-0000-0000-000000000037', 'Australian National University', 'anu', 'ANU', 'ACT', 'Canberra'),
('11111111-0000-0000-0000-000000000038', 'University of Canberra', 'uni-canberra', 'UC', 'ACT', 'Canberra'),
('11111111-0000-0000-0000-000000000039', 'Australian Catholic University', 'acu-act', 'ACU', 'ACT', 'Canberra'),
-- TAS
('11111111-0000-0000-0000-000000000040', 'University of Tasmania', 'utas', 'UTAS', 'TAS', 'Hobart'),
-- NT
('11111111-0000-0000-0000-000000000041', 'Charles Darwin University', 'cdu', 'CDU', 'NT', 'Darwin')
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  short_name = excluded.short_name,
  state = excluded.state,
  city = excluded.city;

insert into public.campuses (id, university_id, name, suburb, state) values
-- USYD
('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Camperdown/Darlington Campus', 'Camperdown', 'NSW'),
('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Cumberland Campus', 'Lidcombe', 'NSW'),
('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Mallett Street Campus', 'Camperdown', 'NSW'),
('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'Rozelle Campus', 'Rozelle', 'NSW'),
-- UNSW
('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000002', 'Kensington Campus', 'Kensington', 'NSW'),
('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000002', 'UNSW Paddington (COFA)', 'Paddington', 'NSW'),
('22222222-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000002', 'UNSW Canberra', 'Canberra', 'ACT'),
-- UTS
('22222222-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000003', 'City Campus', 'Ultimo', 'NSW'),
('22222222-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000003', 'Kuring-gai Campus', 'Lindfield', 'NSW'),
-- Macquarie
('22222222-0000-0000-0000-000000000010', '11111111-0000-0000-0000-000000000004', 'Macquarie Park Campus', 'Macquarie Park', 'NSW'),
('22222222-0000-0000-0000-000000000011', '11111111-0000-0000-0000-000000000004', 'City Campus', 'Sydney CBD', 'NSW'),
-- WSU
('22222222-0000-0000-0000-000000000012', '11111111-0000-0000-0000-000000000005', 'Parramatta Campus', 'Parramatta', 'NSW'),
('22222222-0000-0000-0000-000000000013', '11111111-0000-0000-0000-000000000005', 'Penrith Campus', 'Penrith', 'NSW'),
('22222222-0000-0000-0000-000000000014', '11111111-0000-0000-0000-000000000005', 'Campbelltown Campus', 'Campbelltown', 'NSW'),
('22222222-0000-0000-0000-000000000015', '11111111-0000-0000-0000-000000000005', 'Bankstown Campus', 'Bankstown', 'NSW'),
('22222222-0000-0000-0000-000000000016', '11111111-0000-0000-0000-000000000005', 'Hawkesbury Campus', 'Richmond', 'NSW'),
('22222222-0000-0000-0000-000000000017', '11111111-0000-0000-0000-000000000005', 'Nirimba Campus', 'Quakers Hill', 'NSW'),
-- ACU Sydney
('22222222-0000-0000-0000-000000000018', '11111111-0000-0000-0000-000000000006', 'North Sydney Campus', 'North Sydney', 'NSW'),
('22222222-0000-0000-0000-000000000019', '11111111-0000-0000-0000-000000000006', 'Strathfield Campus', 'Strathfield', 'NSW'),
-- UON
('22222222-0000-0000-0000-000000000020', '11111111-0000-0000-0000-000000000007', 'Callaghan Campus', 'Callaghan', 'NSW'),
('22222222-0000-0000-0000-000000000021', '11111111-0000-0000-0000-000000000007', 'Newcastle City Campus', 'Newcastle', 'NSW'),
('22222222-0000-0000-0000-000000000022', '11111111-0000-0000-0000-000000000007', 'Central Coast Campus', 'Ourimbah', 'NSW'),
-- UOW
('22222222-0000-0000-0000-000000000023', '11111111-0000-0000-0000-000000000008', 'Wollongong Campus', 'Wollongong', 'NSW'),
('22222222-0000-0000-0000-000000000024', '11111111-0000-0000-0000-000000000008', 'Liverpool Campus', 'Liverpool', 'NSW'),
('22222222-0000-0000-0000-000000000025', '11111111-0000-0000-0000-000000000008', 'Bega Campus', 'Bega', 'NSW'),
-- SCU
('22222222-0000-0000-0000-000000000026', '11111111-0000-0000-0000-000000000009', 'Lismore Campus', 'Lismore', 'NSW'),
('22222222-0000-0000-0000-000000000027', '11111111-0000-0000-0000-000000000009', 'Gold Coast Campus', 'Bilinga', 'QLD'),
('22222222-0000-0000-0000-000000000028', '11111111-0000-0000-0000-000000000009', 'Coffs Harbour Campus', 'Coffs Harbour', 'NSW'),
-- CSU
('22222222-0000-0000-0000-000000000029', '11111111-0000-0000-0000-000000000010', 'Bathurst Campus', 'Bathurst', 'NSW'),
('22222222-0000-0000-0000-000000000030', '11111111-0000-0000-0000-000000000010', 'Wagga Wagga Campus', 'Wagga Wagga', 'NSW'),
('22222222-0000-0000-0000-000000000031', '11111111-0000-0000-0000-000000000010', 'Albury-Wodonga Campus', 'Albury', 'NSW'),
('22222222-0000-0000-0000-000000000032', '11111111-0000-0000-0000-000000000010', 'Orange Campus', 'Orange', 'NSW'),
('22222222-0000-0000-0000-000000000033', '11111111-0000-0000-0000-000000000010', 'Port Macquarie Campus', 'Port Macquarie', 'NSW'),
-- UniMelb
('22222222-0000-0000-0000-000000000034', '11111111-0000-0000-0000-000000000011', 'Parkville Campus', 'Parkville', 'VIC'),
('22222222-0000-0000-0000-000000000035', '11111111-0000-0000-0000-000000000011', 'Southbank Campus', 'Southbank', 'VIC'),
('22222222-0000-0000-0000-000000000036', '11111111-0000-0000-0000-000000000011', 'Werribee Campus', 'Werribee', 'VIC'),
-- Monash
('22222222-0000-0000-0000-000000000037', '11111111-0000-0000-0000-000000000012', 'Clayton Campus', 'Clayton', 'VIC'),
('22222222-0000-0000-0000-000000000038', '11111111-0000-0000-0000-000000000012', 'Caulfield Campus', 'Caulfield East', 'VIC'),
('22222222-0000-0000-0000-000000000039', '11111111-0000-0000-0000-000000000012', 'Peninsula Campus', 'Frankston', 'VIC'),
('22222222-0000-0000-0000-000000000040', '11111111-0000-0000-0000-000000000012', 'Parkville Campus', 'Parkville', 'VIC'),
('22222222-0000-0000-0000-000000000041', '11111111-0000-0000-0000-000000000012', 'City Campus', 'Melbourne CBD', 'VIC'),
-- RMIT
('22222222-0000-0000-0000-000000000042', '11111111-0000-0000-0000-000000000013', 'City Campus', 'Melbourne CBD', 'VIC'),
('22222222-0000-0000-0000-000000000043', '11111111-0000-0000-0000-000000000013', 'Bundoora Campus', 'Bundoora', 'VIC'),
('22222222-0000-0000-0000-000000000044', '11111111-0000-0000-0000-000000000013', 'Brunswick Campus', 'Brunswick', 'VIC'),
-- Deakin
('22222222-0000-0000-0000-000000000045', '11111111-0000-0000-0000-000000000014', 'Melbourne Burwood Campus', 'Burwood', 'VIC'),
('22222222-0000-0000-0000-000000000046', '11111111-0000-0000-0000-000000000014', 'Geelong Waurn Ponds Campus', 'Waurn Ponds', 'VIC'),
('22222222-0000-0000-0000-000000000047', '11111111-0000-0000-0000-000000000014', 'Geelong Waterfront Campus', 'Geelong', 'VIC'),
('22222222-0000-0000-0000-000000000048', '11111111-0000-0000-0000-000000000014', 'Warrnambool Campus', 'Warrnambool', 'VIC'),
-- La Trobe
('22222222-0000-0000-0000-000000000049', '11111111-0000-0000-0000-000000000015', 'Bundoora Campus', 'Bundoora', 'VIC'),
('22222222-0000-0000-0000-000000000050', '11111111-0000-0000-0000-000000000015', 'City Campus', 'Melbourne CBD', 'VIC'),
('22222222-0000-0000-0000-000000000051', '11111111-0000-0000-0000-000000000015', 'Bendigo Campus', 'Bendigo', 'VIC'),
('22222222-0000-0000-0000-000000000052', '11111111-0000-0000-0000-000000000015', 'Albury-Wodonga Campus', 'Wodonga', 'VIC'),
('22222222-0000-0000-0000-000000000053', '11111111-0000-0000-0000-000000000015', 'Mildura Campus', 'Mildura', 'VIC'),
('22222222-0000-0000-0000-000000000054', '11111111-0000-0000-0000-000000000015', 'Shepparton Campus', 'Shepparton', 'VIC'),
-- Swinburne
('22222222-0000-0000-0000-000000000055', '11111111-0000-0000-0000-000000000016', 'Hawthorn Campus', 'Hawthorn', 'VIC'),
('22222222-0000-0000-0000-000000000056', '11111111-0000-0000-0000-000000000016', 'Croydon Campus', 'Croydon', 'VIC'),
('22222222-0000-0000-0000-000000000057', '11111111-0000-0000-0000-000000000016', 'Wantirna Campus', 'Wantirna', 'VIC'),
-- Victoria University
('22222222-0000-0000-0000-000000000058', '11111111-0000-0000-0000-000000000017', 'Footscray Park Campus', 'Footscray', 'VIC'),
('22222222-0000-0000-0000-000000000059', '11111111-0000-0000-0000-000000000017', 'City Flinders Campus', 'Melbourne CBD', 'VIC'),
('22222222-0000-0000-0000-000000000060', '11111111-0000-0000-0000-000000000017', 'St Albans Campus', 'St Albans', 'VIC'),
('22222222-0000-0000-0000-000000000061', '11111111-0000-0000-0000-000000000017', 'Sunshine Campus', 'Sunshine', 'VIC'),
-- ACU Melbourne
('22222222-0000-0000-0000-000000000062', '11111111-0000-0000-0000-000000000018', 'Melbourne Campus', 'Fitzroy', 'VIC'),
-- Federation University
('22222222-0000-0000-0000-000000000063', '11111111-0000-0000-0000-000000000019', 'Ballarat Campus', 'Ballarat', 'VIC'),
('22222222-0000-0000-0000-000000000064', '11111111-0000-0000-0000-000000000019', 'Gippsland Campus', 'Churchill', 'VIC'),
('22222222-0000-0000-0000-000000000065', '11111111-0000-0000-0000-000000000019', 'Berwick Campus', 'Berwick', 'VIC'),
-- UQ
('22222222-0000-0000-0000-000000000066', '11111111-0000-0000-0000-000000000020', 'St Lucia Campus', 'St Lucia', 'QLD'),
('22222222-0000-0000-0000-000000000067', '11111111-0000-0000-0000-000000000020', 'Gatton Campus', 'Gatton', 'QLD'),
('22222222-0000-0000-0000-000000000068', '11111111-0000-0000-0000-000000000020', 'Herston Campus', 'Herston', 'QLD'),
-- QUT
('22222222-0000-0000-0000-000000000069', '11111111-0000-0000-0000-000000000021', 'Gardens Point Campus', 'Brisbane CBD', 'QLD'),
('22222222-0000-0000-0000-000000000070', '11111111-0000-0000-0000-000000000021', 'Kelvin Grove Campus', 'Kelvin Grove', 'QLD'),
-- Griffith
('22222222-0000-0000-0000-000000000071', '11111111-0000-0000-0000-000000000022', 'Nathan Campus', 'Nathan', 'QLD'),
('22222222-0000-0000-0000-000000000072', '11111111-0000-0000-0000-000000000022', 'Gold Coast Campus', 'Southport', 'QLD'),
('22222222-0000-0000-0000-000000000073', '11111111-0000-0000-0000-000000000022', 'Mt Gravatt Campus', 'Mount Gravatt', 'QLD'),
('22222222-0000-0000-0000-000000000074', '11111111-0000-0000-0000-000000000022', 'South Bank Campus', 'South Brisbane', 'QLD'),
('22222222-0000-0000-0000-000000000075', '11111111-0000-0000-0000-000000000022', 'Logan Campus', 'Meadowbrook', 'QLD'),
-- JCU
('22222222-0000-0000-0000-000000000076', '11111111-0000-0000-0000-000000000023', 'Townsville Campus', 'Douglas', 'QLD'),
('22222222-0000-0000-0000-000000000077', '11111111-0000-0000-0000-000000000023', 'Cairns Campus', 'Smithfield', 'QLD'),
('22222222-0000-0000-0000-000000000078', '11111111-0000-0000-0000-000000000023', 'Brisbane Campus', 'Brisbane CBD', 'QLD'),
-- USQ
('22222222-0000-0000-0000-000000000079', '11111111-0000-0000-0000-000000000024', 'Toowoomba Campus', 'Toowoomba', 'QLD'),
('22222222-0000-0000-0000-000000000080', '11111111-0000-0000-0000-000000000024', 'Ipswich Campus', 'Ipswich', 'QLD'),
('22222222-0000-0000-0000-000000000081', '11111111-0000-0000-0000-000000000024', 'Springfield Campus', 'Springfield', 'QLD'),
-- Bond
('22222222-0000-0000-0000-000000000082', '11111111-0000-0000-0000-000000000025', 'Gold Coast Campus', 'Robina', 'QLD'),
-- CQU
('22222222-0000-0000-0000-000000000083', '11111111-0000-0000-0000-000000000026', 'Rockhampton Campus', 'Rockhampton', 'QLD'),
('22222222-0000-0000-0000-000000000084', '11111111-0000-0000-0000-000000000026', 'Brisbane Campus', 'Brisbane CBD', 'QLD'),
('22222222-0000-0000-0000-000000000085', '11111111-0000-0000-0000-000000000026', 'Mackay Campus', 'Mackay', 'QLD'),
('22222222-0000-0000-0000-000000000086', '11111111-0000-0000-0000-000000000026', 'Bundaberg Campus', 'Bundaberg', 'QLD'),
('22222222-0000-0000-0000-000000000087', '11111111-0000-0000-0000-000000000026', 'Gladstone Campus', 'Gladstone', 'QLD'),
-- ACU Brisbane
('22222222-0000-0000-0000-000000000088', '11111111-0000-0000-0000-000000000027', 'Brisbane Campus', 'Banyo', 'QLD'),
-- UWA
('22222222-0000-0000-0000-000000000089', '11111111-0000-0000-0000-000000000028', 'Crawley Campus', 'Crawley', 'WA'),
('22222222-0000-0000-0000-000000000090', '11111111-0000-0000-0000-000000000028', 'Albany Campus', 'Albany', 'WA'),
-- Curtin
('22222222-0000-0000-0000-000000000091', '11111111-0000-0000-0000-000000000029', 'Bentley Campus', 'Bentley', 'WA'),
('22222222-0000-0000-0000-000000000092', '11111111-0000-0000-0000-000000000029', 'City Campus', 'Perth CBD', 'WA'),
('22222222-0000-0000-0000-000000000093', '11111111-0000-0000-0000-000000000029', 'Kalgoorlie Campus', 'Kalgoorlie', 'WA'),
('22222222-0000-0000-0000-000000000094', '11111111-0000-0000-0000-000000000029', 'Midland Campus', 'Midland', 'WA'),
-- Murdoch
('22222222-0000-0000-0000-000000000095', '11111111-0000-0000-0000-000000000030', 'Murdoch Campus', 'Murdoch', 'WA'),
('22222222-0000-0000-0000-000000000096', '11111111-0000-0000-0000-000000000030', 'Rockingham Campus', 'Rockingham', 'WA'),
('22222222-0000-0000-0000-000000000097', '11111111-0000-0000-0000-000000000030', 'Mandurah Campus', 'Mandurah', 'WA'),
-- ECU
('22222222-0000-0000-0000-000000000098', '11111111-0000-0000-0000-000000000031', 'Joondalup Campus', 'Joondalup', 'WA'),
('22222222-0000-0000-0000-000000000099', '11111111-0000-0000-0000-000000000031', 'Mount Lawley Campus', 'Mount Lawley', 'WA'),
('22222222-0000-0000-0000-000000000100', '11111111-0000-0000-0000-000000000031', 'South West Campus', 'Bunbury', 'WA'),
-- Notre Dame WA
('22222222-0000-0000-0000-000000000101', '11111111-0000-0000-0000-000000000032', 'Fremantle Campus', 'Fremantle', 'WA'),
('22222222-0000-0000-0000-000000000102', '11111111-0000-0000-0000-000000000032', 'Broome Campus', 'Broome', 'WA'),
-- University of Adelaide
('22222222-0000-0000-0000-000000000103', '11111111-0000-0000-0000-000000000033', 'North Terrace Campus', 'Adelaide CBD', 'SA'),
('22222222-0000-0000-0000-000000000104', '11111111-0000-0000-0000-000000000033', 'Waite Campus', 'Urrbrae', 'SA'),
('22222222-0000-0000-0000-000000000105', '11111111-0000-0000-0000-000000000033', 'Roseworthy Campus', 'Roseworthy', 'SA'),
-- UniSA
('22222222-0000-0000-0000-000000000106', '11111111-0000-0000-0000-000000000034', 'City West Campus', 'Adelaide CBD', 'SA'),
('22222222-0000-0000-0000-000000000107', '11111111-0000-0000-0000-000000000034', 'City East Campus', 'Adelaide CBD', 'SA'),
('22222222-0000-0000-0000-000000000108', '11111111-0000-0000-0000-000000000034', 'Mawson Lakes Campus', 'Mawson Lakes', 'SA'),
('22222222-0000-0000-0000-000000000109', '11111111-0000-0000-0000-000000000034', 'Magill Campus', 'Magill', 'SA'),
-- Flinders
('22222222-0000-0000-0000-000000000110', '11111111-0000-0000-0000-000000000035', 'Bedford Park Campus', 'Bedford Park', 'SA'),
('22222222-0000-0000-0000-000000000111', '11111111-0000-0000-0000-000000000035', 'City Campus', 'Adelaide CBD', 'SA'),
('22222222-0000-0000-0000-000000000112', '11111111-0000-0000-0000-000000000035', 'Tonsley Campus', 'Tonsley', 'SA'),
-- ACU Adelaide
('22222222-0000-0000-0000-000000000113', '11111111-0000-0000-0000-000000000036', 'Adelaide Campus', 'Adelaide CBD', 'SA'),
-- ANU
('22222222-0000-0000-0000-000000000114', '11111111-0000-0000-0000-000000000037', 'Acton Campus', 'Acton', 'ACT'),
-- UC
('22222222-0000-0000-0000-000000000115', '11111111-0000-0000-0000-000000000038', 'Bruce Campus', 'Bruce', 'ACT'),
-- ACU Canberra
('22222222-0000-0000-0000-000000000116', '11111111-0000-0000-0000-000000000039', 'Canberra Campus', 'Watson', 'ACT'),
-- UTAS
('22222222-0000-0000-0000-000000000117', '11111111-0000-0000-0000-000000000040', 'Hobart Campus', 'Sandy Bay', 'TAS'),
('22222222-0000-0000-0000-000000000118', '11111111-0000-0000-0000-000000000040', 'Launceston Campus', 'Newnham', 'TAS'),
('22222222-0000-0000-0000-000000000119', '11111111-0000-0000-0000-000000000040', 'Cradle Coast Campus', 'Burnie', 'TAS'),
-- CDU
('22222222-0000-0000-0000-000000000120', '11111111-0000-0000-0000-000000000041', 'Casuarina Campus', 'Casuarina', 'NT'),
('22222222-0000-0000-0000-000000000121', '11111111-0000-0000-0000-000000000041', 'Alice Springs Campus', 'Alice Springs', 'NT'),
('22222222-0000-0000-0000-000000000122', '11111111-0000-0000-0000-000000000041', 'Palmerston Campus', 'Palmerston', 'NT')
on conflict (id) do update set
  university_id = excluded.university_id,
  name = excluded.name,
  suburb = excluded.suburb,
  state = excluded.state;

update public.campuses
set slug = trim(
  both '-'
  from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
)
where slug is null or btrim(slug) = '';
