-- Run this in the Supabase SQL editor

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null default 'member',
  email text,
  telegram_username text,
  wallet_address text,
  notes text,
  active boolean not null default true,
  added_at timestamptz not null default now()
);

create table if not exists funding_sources (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_type text not null default 'donation',
  contributor_name text,
  contributor_contact text,
  amount_usd numeric not null default 0,
  status text not null default 'pledged',
  date date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'custom',
  status text not null default 'draft',
  start_date date,
  end_date date,
  target_usd numeric,
  raised_usd numeric not null default 0,
  participants integer not null default 0,
  platform text,
  description text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If the table already exists, add the column:
alter table campaigns add column if not exists participants integer not null default 0;

-- Campaign participation tracking
create table if not exists campaign_participants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  wallet_address text not null,
  joined_at timestamptz not null default now(),
  unique(campaign_id, wallet_address)
);

-- RPC to safely increment participant count
create or replace function increment_participants(cid uuid)
returns void language sql as $$
  update campaigns set participants = participants + 1 where id = cid;
$$;

-- Campaign ↔ charity link + salawat tracking
alter table campaigns add column if not exists charity_id uuid references charities(id) on delete set null;
alter table campaigns add column if not exists salawat_count integer not null default 0;
alter table campaigns add column if not exists target_count  integer;

-- Tag salawat logs with the campaign they belong to
alter table salawat_logs add column if not exists campaign_id uuid references campaigns(id) on delete set null;

-- RPC: increment salawat_count on a campaign
create or replace function increment_campaign_salawat(cid uuid, n integer)
returns void language sql as $$
  update campaigns set salawat_count = salawat_count + n where id = cid;
$$;

-- RPC: increment raised_usd on a campaign
create or replace function increment_campaign_raised(cid uuid, usd numeric)
returns void language sql as $$
  update campaigns set raised_usd = raised_usd + usd where id = cid;
$$;
