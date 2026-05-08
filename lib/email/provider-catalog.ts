import type { EmailProviderName } from "@/lib/email/provider";

export type ProviderCatalogEntry = {
  provider: EmailProviderName;
  label: string;
  envKeys: string[];
  senderSetup: "api" | "manual" | "smtp";
  dnsNotes: string[];
};

export const PROVIDER_CATALOG: ProviderCatalogEntry[] = [
  {
    provider: "auto",
    label: "Auto",
    envKeys: ["EMAIL_PROVIDER=auto"],
    senderSetup: "manual",
    dnsNotes: ["Essaie automatiquement les providers dont les cles sont configurees."]
  },
  {
    provider: "resend",
    label: "Resend",
    envKeys: ["RESEND_API_KEY"],
    senderSetup: "api",
    dnsNotes: ["SPF/DKIM/DMARC fournis par Resend apres creation du domaine."]
  },
  {
    provider: "mailgun",
    label: "Mailgun",
    envKeys: ["MAILGUN_API_KEY", "MAILGUN_DOMAIN", "MAILGUN_BASE_URL"],
    senderSetup: "api",
    dnsNotes: ["SPF/DKIM/MX/tracking fournis par Mailgun apres creation du domaine."]
  },
  {
    provider: "smtp",
    label: "SMTP generique",
    envKeys: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"],
    senderSetup: "smtp",
    dnsNotes: ["La verification depend du fournisseur SMTP: SES, Zoho, Brevo, Google Workspace, Microsoft 365, etc."]
  },
  {
    provider: "sendgrid",
    label: "SendGrid",
    envKeys: ["SENDGRID_API_KEY"],
    senderSetup: "manual",
    dnsNotes: ["Verifier le domaine dans Sender Authentication puis ajouter SPF/DKIM fournis par SendGrid."]
  },
  {
    provider: "postmark",
    label: "Postmark",
    envKeys: ["POSTMARK_SERVER_TOKEN"],
    senderSetup: "manual",
    dnsNotes: ["Verifier le domaine ou sender signature dans Postmark avant l'envoi."]
  },
  {
    provider: "brevo",
    label: "Brevo",
    envKeys: ["BREVO_API_KEY"],
    senderSetup: "manual",
    dnsNotes: ["Verifier le domaine dans Brevo avec les DNS fournis par Brevo."]
  },
  {
    provider: "mailersend",
    label: "MailerSend",
    envKeys: ["MAILERSEND_API_KEY"],
    senderSetup: "manual",
    dnsNotes: ["Verifier le domaine dans MailerSend avec SPF/DKIM/DMARC."]
  },
  {
    provider: "gmail_oauth",
    label: "Gmail OAuth",
    envKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI", "CREDENTIAL_ENCRYPTION_KEY"],
    senderSetup: "api",
    dnsNotes: ["Chaque compte Gmail est connecte par OAuth. Aucun mot de passe Gmail n'est stocke."]
  }
];
