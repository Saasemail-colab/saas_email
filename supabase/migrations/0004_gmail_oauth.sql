-- Support Gmail OAuth multi-comptes.

alter table public.email_provider_accounts
  drop constraint if exists email_provider_accounts_provider_check;

alter table public.email_provider_accounts
  add constraint email_provider_accounts_provider_check
  check (provider in ('resend', 'smtp', 'sendgrid', 'mailgun', 'postmark', 'brevo', 'mailersend', 'ses', 'gmail_oauth'));

create index if not exists sender_identities_provider_account_idx
  on public.sender_identities (provider_account_id);
