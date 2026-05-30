-- Canonical schema for the `users` and `salawat_logs` tables.
-- These were originally created by hand in the Supabase dashboard; this file
-- makes them version-controlled and enforces the constraints the app's
-- identity/linking flow depends on. Safe to re-run (idempotent).
--
-- Run this in the Supabase SQL editor.

-- ─── users ──────────────────────────────────────────────────────────────────
-- One row per person. Identified by Telegram id and/or Celo wallet address.
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  telegram_id   text,
  wallet_address text,
  username      text,        -- verified Telegram @handle (from link-wallet)
  display_name  text,        -- self-chosen nickname for pure-web users
  first_name    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- If the table already exists, add the self-chosen nickname column:
alter table users add column if not exists display_name text;

-- ─── salawat_logs ───────────────────────────────────────────────────────────
create table if not exists salawat_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete set null,
  count         integer not null default 1,
  tokens_earned numeric not null default 0,
  multiplier    numeric not null default 1,
  status        text not null default 'pending',
  tx_hash       text,
  error_message text,
  campaign_id   uuid references campaigns(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── Data normalization (run BEFORE adding the unique indexes) ───────────────
-- Wallet addresses must be stored lowercase so that case-insensitive providers
-- (Privy returns checksummed, the bot accepts free text) all reconcile.
update users
   set wallet_address = lower(wallet_address)
 where wallet_address is not null
   and wallet_address <> lower(wallet_address);

-- ─── De-duplicate users that share one wallet ───────────────────────────────
-- A web-first user (wallet-only row) who later links via Telegram could end up
-- with two rows for the same wallet. Merge them: keep the oldest row, repoint
-- its salawat_logs, and prefer to retain the telegram_id/username/first_name.
with ranked as (
  select id, wallet_address,
         first_value(id) over (
           partition by lower(wallet_address)
           order by (telegram_id is not null) desc, created_at asc
         ) as keep_id
    from users
   where wallet_address is not null
)
update salawat_logs sl
   set user_id = r.keep_id
  from ranked r
 where sl.user_id = r.id
   and r.id <> r.keep_id;

-- Fold telegram identity from duplicates onto the survivor, then delete dupes.
with ranked as (
  select id, telegram_id, username, first_name,
         first_value(id) over (
           partition by lower(wallet_address)
           order by (telegram_id is not null) desc, created_at asc
         ) as keep_id
    from users
   where wallet_address is not null
)
update users u
   set telegram_id = coalesce(u.telegram_id, d.telegram_id),
       username    = coalesce(u.username, d.username),
       first_name  = coalesce(u.first_name, d.first_name)
  from ranked d
 where u.id = d.keep_id
   and d.id <> d.keep_id
   and d.telegram_id is not null;

delete from users u
 using (
   select id,
          first_value(id) over (
            partition by lower(wallet_address)
            order by (telegram_id is not null) desc, created_at asc
          ) as keep_id
     from users
    where wallet_address is not null
 ) r
 where u.id = r.id
   and r.id <> r.keep_id;

-- ─── Constraints the linking flow depends on ────────────────────────────────
-- Required: link-wallet upserts with onConflict: "telegram_id".
create unique index if not exists users_telegram_id_key
  on users (telegram_id)
  where telegram_id is not null;

-- Required: prevents two rows for one wallet (the BUG-1 duplicate-row hazard).
-- Case-insensitive on the canonical (already-lowercased) value.
create unique index if not exists users_wallet_address_key
  on users (lower(wallet_address))
  where wallet_address is not null;
