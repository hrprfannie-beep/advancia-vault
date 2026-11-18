-- Apply in Supabase SQL Editor before deploying the owner-scoped push API.
-- Legacy records remain unowned and are intentionally inaccessible until
-- an administrator verifies and assigns each record to its actual user.

create table if not exists public.issued_cards (
  id                    uuid default gen_random_uuid() primary key,
  owner_user_id         uuid references auth.users(id) on delete cascade,
  wallet_address        text not null,
  stripe_cardholder_id  text not null,
  stripe_card_id        text not null unique,
  last4                 text not null,
  expiry_month          int not null,
  expiry_year           int not null,
  network               text default 'visa',
  daily_limit           numeric default 2500,
  spent_today           numeric default 0,
  status                text default 'active' check (status in ('active','frozen','cancelled')),
  online_enabled        boolean default true,
  intl_enabled          boolean default false,
  created_at            timestamptz default now()
);

create table if not exists public.push_subscriptions (
  id             uuid default gen_random_uuid() primary key,
  owner_user_id  uuid references auth.users(id) on delete cascade,
  endpoint       text,
  wallet_address text unique,
  subscription   text not null,
  updated_at     timestamptz default now()
);

create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  type          text not null check (type in ('swap', 'send', 'receive', 'earn', 'card_spend')),
  from_token    text not null,
  to_token      text,
  from_amount   numeric not null check (from_amount >= 0),
  to_amount     numeric check (to_amount is null or to_amount >= 0),
  usd_value     numeric not null check (usd_value >= 0),
  tx_hash       text,
  status        text not null check (status in ('pending', 'confirmed', 'failed')),
  created_at    timestamptz not null default now(),
  chain         text not null,
  fee_usd       numeric not null default 0 check (fee_usd >= 0),
  provider_event_id text
);

alter table public.issued_cards
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;

alter table public.push_subscriptions
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;

alter table public.push_subscriptions
  add column if not exists endpoint text;

alter table public.transactions
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.transactions
  add column if not exists provider_event_id text;

alter table public.push_subscriptions
  alter column wallet_address drop not null;

create index if not exists idx_cards_owner_user
  on public.issued_cards(owner_user_id);

drop index if exists public.idx_push_subscriptions_owner_user;

drop index if exists public.idx_push_subscriptions_owner_endpoint;

create unique index if not exists idx_push_subscriptions_endpoint
  on public.push_subscriptions(endpoint);

create index if not exists idx_push_subscriptions_owner_user
  on public.push_subscriptions(owner_user_id);

create index if not exists idx_transactions_owner_created
  on public.transactions(user_id, created_at desc);

create unique index if not exists idx_transactions_provider_event
  on public.transactions(provider_event_id);

alter table public.issued_cards enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.transactions enable row level security;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('issued_cards', 'push_subscriptions', 'transactions')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;
end
$$;

create policy "Users read own cards" on public.issued_cards
  for select to authenticated using (owner_user_id = (select auth.uid()));

create policy "Users manage own push subscription" on public.push_subscriptions
  for all to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

create policy "Users read own transactions" on public.transactions
  for select to authenticated using (user_id = (select auth.uid()));
