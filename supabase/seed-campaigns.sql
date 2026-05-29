-- Seed campaigns — run in Supabase SQL editor after admin-tables.sql
-- Safe to re-run: deletes existing seed rows first (identified by name)

delete from campaigns where name in (
  'Arbaeen Ziyarat Fund 2026',
  'Salawat Million Challenge',
  'Ghadir Day — 18 Dhul Hijja',
  'Clean Water for Yemen',
  'Islamic Education Scholarship',
  'Ramadan GHDR Boost 2026'
);

insert into campaigns (name, type, status, description, start_date, end_date, target_usd, raised_usd, participants, platform) values

(
  'Arbaeen Ziyarat Fund 2026',
  'fundraising', 'active',
  'Support low-income families to perform Ziyarat Arbaeen. Verified by The Zahra Trust. Funds released quarterly to pilgrims in need.',
  '2026-05-01', '2026-08-25', 5000, 2150, 318, 'multiple'
),

(
  'Salawat Million Challenge',
  'salawat', 'active',
  'Collectively reach 1,000,000 recorded Salawat before Eid al-Adha. Every Salawat counts — invite your family and masjid.',
  '2026-05-15', '2026-06-30', null, 0, 1240, 'telegram'
),

(
  'Ghadir Day — 18 Dhul Hijja',
  'special_day', 'active',
  'Special 3× GHDR multiplier on the Day of Ghadir. Log extra Salawat, earn bonus tokens, and commemorate Imam Ali''s appointment.',
  '2026-07-12', '2026-07-12', null, 0, 0, 'instagram'
),

(
  'Clean Water for Yemen',
  'fundraising', 'active',
  'Fund solar-powered water purification systems for rural Yemen. Every 1,000 GHDR = $1 donated directly to the field partner.',
  '2026-04-01', '2026-09-30', 10000, 3400, 487, 'website'
),

(
  'Islamic Education Scholarship',
  'awareness', 'paused',
  'Raise funds for Islamic studies scholarships. Launching July 2026 with partner institutions across three countries.',
  '2026-07-01', null, null, 0, 0, 'email'
),

(
  'Ramadan GHDR Boost 2026',
  'ramadan', 'completed',
  '2× multiplier ran throughout Ramadan 2026. Community earned 1.8M+ GHDR and donated $1,875 in hadiya to verified charities.',
  '2026-03-01', '2026-03-30', 2000, 1875, 892, 'telegram'
);
