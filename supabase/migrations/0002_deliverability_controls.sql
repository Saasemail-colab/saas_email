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

