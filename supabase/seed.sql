-- Remplacer les valeurs avant execution.
-- Le domaine doit deja etre verifie dans Resend et dans vos DNS.

insert into public.organizations (id, name, plan, status)
values (
  '00000000-0000-0000-0000-000000000001',
  'Organisation Demo',
  'starter',
  'active'
)
on conflict (id) do update
set name = excluded.name,
    plan = excluded.plan,
    status = excluded.status;

insert into public.domains (organization_id, domain, status)
values (
  '00000000-0000-0000-0000-000000000001',
  'votre-domaine.com',
  'verified'
)
on conflict (organization_id, domain) do update
set status = excluded.status;

insert into public.sender_identities (organization_id, email, display_name, status)
values (
  '00000000-0000-0000-0000-000000000001',
  'support@votre-domaine.com',
  'Support',
  'verified'
)
on conflict (organization_id, email) do update
set display_name = excluded.display_name,
    status = excluded.status;

