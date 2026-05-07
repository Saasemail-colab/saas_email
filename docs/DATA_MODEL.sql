-- Schema initial indicatif pour PostgreSQL.
-- Il sert de base de discussion avant implementation ORM.

create table organizations (
  id uuid primary key,
  name text not null,
  plan text not null default 'starter',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key,
  email text not null unique,
  name text,
  created_at timestamptz not null default now()
);

create table organization_members (
  organization_id uuid not null references organizations(id),
  user_id uuid not null references users(id),
  role text not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table domains (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  domain text not null,
  status text not null default 'pending',
  dkim_selector text,
  dkim_public_key text,
  created_at timestamptz not null default now(),
  unique (organization_id, domain)
);

create table sender_identities (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  domain_id uuid references domains(id),
  email text not null,
  display_name text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

create table contacts (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  email text not null,
  name text,
  consent_status text not null default 'unknown',
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

create table email_messages (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  sender_identity_id uuid not null references sender_identities(id),
  subject text not null,
  html_body text,
  text_body text,
  status text not null default 'queued',
  provider text,
  provider_message_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create table email_recipients (
  id uuid primary key,
  message_id uuid not null references email_messages(id),
  contact_id uuid references contacts(id),
  email text not null,
  kind text not null default 'to',
  status text not null default 'queued'
);

create table email_events (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  message_id uuid references email_messages(id),
  recipient_id uuid references email_recipients(id),
  event_type text not null,
  provider text,
  provider_event_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table inbound_conversations (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  subject text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table inbound_messages (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  conversation_id uuid references inbound_conversations(id),
  from_email text not null,
  to_email text not null,
  subject text,
  raw_storage_key text,
  html_body text,
  text_body text,
  received_at timestamptz not null default now()
);

create table api_keys (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  name text not null,
  key_prefix text not null,
  key_hash text not null,
  scopes text[] not null default '{}',
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key,
  organization_id uuid not null references organizations(id),
  actor_user_id uuid references users(id),
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

