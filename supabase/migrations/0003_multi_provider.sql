-- Support multi-provider par organisation et par expediteur.

create table if not exists public.email_provider_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  provider text not null check (provider in ('gmail_smtp', 'gmail_oauth', 'resend')),
  status text not null default 'active' check (status in ('active', 'paused', 'disabled')),
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

alter table public.email_provider_accounts enable row level security;

alter table public.sender_identities
  add column if not exists provider_account_id uuid references public.email_provider_accounts(id) on delete set null;

create index if not exists email_provider_accounts_org_provider_idx
  on public.email_provider_accounts (organization_id, provider, status);
