-- Country-specific structure for the global rollout.
-- Data-driven: adding a country is an INSERT here, never a code change.
-- Run this in the Supabase SQL editor. Idempotent / safe to re-run.

-- ─── countries (reference table) ────────────────────────────────────────────
create table if not exists countries (
  code             text primary key,        -- ISO 3166-1 alpha-2: 'PK','GB','US'
  name             text not null,
  region           text,                     -- 'MENA','South Asia','Europe',...
  status           text not null default 'coming_soon', -- 'live'|'coming_soon'|'restricted'
  default_locale   text,                     -- 'en'|'ar'|'fa'|'ur' (ties to app i18n)
  currency_code    text,                     -- ISO 4217: 'PKR','GBP','AED'
  currency_symbol  text,
  usd_fx_rate      numeric,                  -- local units per 1 USD — DISPLAY ONLY
  kyc_required     boolean not null default false,
  max_donation_usd numeric,                  -- per-country compliance cap (null = none)
  disclaimer_key   text,                     -- i18n key for a localized legal notice
  created_at       timestamptz not null default now()
);

-- ─── Seed the first handful (live). Others can be added later as rows. ───────
insert into countries (code, name, region, status, default_locale, currency_code, currency_symbol, usd_fx_rate)
values
  ('PK', 'Pakistan',        'South Asia',    'live', 'ur', 'PKR', '₨',   278),
  ('IN', 'India',           'South Asia',    'live', 'en', 'INR', '₹',    83),
  ('AE', 'United Arab Emirates', 'MENA',     'live', 'ar', 'AED', 'د.إ', 3.67),
  ('GB', 'United Kingdom',  'Europe',        'live', 'en', 'GBP', '£',  0.79),
  ('US', 'United States',   'North America', 'live', 'en', 'USD', '$',     1)
on conflict (code) do nothing;

-- ─── charities: link to a country (keep existing free-text `country`) ────────
alter table charities add column if not exists country_code text references countries(code);

-- Best-effort backfill from the existing free-text country names
update charities set country_code = 'PK' where country_code is null and lower(country) in ('pakistan','pk');
update charities set country_code = 'IN' where country_code is null and lower(country) in ('india','in');
update charities set country_code = 'AE' where country_code is null and lower(country) in ('uae','united arab emirates','ae');
update charities set country_code = 'GB' where country_code is null and lower(country) in ('uk','united kingdom','great britain','gb');
update charities set country_code = 'US' where country_code is null and lower(country) in ('usa','united states','us','united states of america');

-- ─── users: remember the chosen country (auto-detected, user-overridable) ────
alter table users add column if not exists country_code  text;
alter table users add column if not exists country_source text;  -- 'auto' | 'user'
