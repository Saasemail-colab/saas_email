-- Schema complet EmailOps pour Supabase. Execute ce fichier dans Supabase SQL Editor avant de connecter Gmail.

-- ============================================================
-- supabase\migrations\0001_initial_schema.sql
-- ============================================================

-- Migration Supabase initiale.
-- A executer dans Supabase SQL Editor ou via Supabase CLI.

create extension if not exists "pgcrypto";

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'starter',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'developer', 'marketer', 'support', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  domain text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'suspended')),
  dkim_selector text,
  dkim_public_key text,
  created_at timestamptz not null default now(),
  unique (organization_id, domain)
);

create table if not exists public.sender_identities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  domain_id uuid references public.domains(id) on delete set null,
  email text not null,
  display_name text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'suspended')),
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  name text,
  consent_status text not null default 'unknown' check (consent_status in ('unknown', 'granted', 'revoked')),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sender_identity_id uuid not null references public.sender_identities(id),
  subject text not null,
  html_body text,
  text_body text,
  status text not null default 'queued',
  provider text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.email_recipients (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.email_messages(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  email text not null,
  kind text not null default 'to' check (kind in ('to', 'cc', 'bcc')),
  status text not null default 'queued'
);

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  message_id uuid references public.email_messages(id) on delete set null,
  recipient_id uuid references public.email_recipients(id) on delete set null,
  event_type text not null,
  provider text,
  provider_event_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.inbound_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subject text,
  status text not null default 'open' check (status in ('open', 'pending', 'resolved', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inbound_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid references public.inbound_conversations(id) on delete set null,
  from_email text not null,
  to_email text not null,
  subject text,
  raw_storage_key text,
  html_body text,
  text_body text,
  received_at timestamptz not null default now()
);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  scopes text[] not null default '{}',
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.organization_members enable row level security;
alter table public.domains enable row level security;
alter table public.sender_identities enable row level security;
alter table public.contacts enable row level security;
alter table public.email_messages enable row level security;
alter table public.email_recipients enable row level security;
alter table public.email_events enable row level security;
alter table public.inbound_conversations enable row level security;
alter table public.inbound_messages enable row level security;
alter table public.api_keys enable row level security;
alter table public.audit_logs enable row level security;

-- Le backend utilise SUPABASE_SERVICE_ROLE_KEY, qui contourne RLS.
-- Les policies utilisateur seront ajoutees quand l'authentification sera branchee.


-- ============================================================
-- supabase\migrations\0002_deliverability_controls.sql
-- ============================================================

-- Controles de delivrabilite et suppression list.

create table if not exists public.contact_suppressions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  reason text not null default 'manual' check (reason in ('manual', 'unsubscribe', 'bounce', 'complaint')),
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

alter table public.contact_suppressions enable row level security;

create index if not exists contact_suppressions_org_email_idx
  on public.contact_suppressions (organization_id, email);

create index if not exists sender_identities_org_email_status_idx
  on public.sender_identities (organization_id, email, status);

create index if not exists domains_org_domain_status_idx
  on public.domains (organization_id, domain, status);

create index if not exists email_messages_org_created_idx
  on public.email_messages (organization_id, created_at desc);


-- ============================================================
-- supabase\migrations\0003_multi_provider.sql
-- ============================================================

-- Support multi-provider par organisation et par expediteur.

create table if not exists public.email_provider_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  provider text not null check (provider in ('gmail_oauth', 'resend', 'smtp', 'mailgun')),
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

-- ============================================================
-- supabase\migrations\0004_gmail_oauth.sql
-- ============================================================

-- Support Gmail OAuth multi-comptes.

alter table public.email_provider_accounts
  drop constraint if exists email_provider_accounts_provider_check;

delete from public.email_provider_accounts
  where provider not in ('gmail_oauth', 'resend', 'smtp', 'mailgun');

alter table public.email_provider_accounts
  add constraint email_provider_accounts_provider_check
  check (provider in ('gmail_oauth', 'resend', 'smtp', 'mailgun'));

create index if not exists sender_identities_provider_account_idx
  on public.sender_identities (provider_account_id);
