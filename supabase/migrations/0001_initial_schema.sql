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

