-- Support Gmail OAuth multi-comptes.

alter table public.email_provider_accounts
  drop constraint if exists email_provider_accounts_provider_check;

delete from public.email_provider_accounts
  where provider not in ('gmail_smtp', 'gmail_oauth', 'resend', 'smtp', 'mailgun');

alter table public.email_provider_accounts
  add constraint email_provider_accounts_provider_check
  check (provider in ('gmail_smtp', 'gmail_oauth', 'resend', 'smtp', 'mailgun'));

create index if not exists sender_identities_provider_account_idx
  on public.sender_identities (provider_account_id);
