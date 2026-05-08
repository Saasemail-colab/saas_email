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
    dnsNotes: ["Priorite Gmail SMTP/OAuth pour les comptes Gmail, puis Resend, SMTP ou Mailgun selon la configuration."]
  },
  {
    provider: "gmail_smtp",
    label: "Gmail SMTP",
    envKeys: ["GMAIL_SMTP_USER", "GMAIL_SMTP_PASS"],
    senderSetup: "smtp",
    dnsNotes: ["Alternative simple a OAuth: utilise un mot de passe d'application Google du compte Gmail expediteur."]
  },
  {
    provider: "gmail_oauth",
    label: "Gmail OAuth",
    envKeys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI", "CREDENTIAL_ENCRYPTION_KEY"],
    senderSetup: "api",
    dnsNotes: ["Chaque compte Gmail est connecte par OAuth. Aucun mot de passe Gmail n'est stocke."]
  },
  {
    provider: "resend",
    label: "Resend",
    envKeys: ["RESEND_API_KEY"],
    senderSetup: "api",
    dnsNotes: ["SPF/DKIM/DMARC fournis par Resend apres creation du domaine."]
  },
  {
    provider: "smtp",
    label: "SMTP generique",
    envKeys: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"],
    senderSetup: "smtp",
    dnsNotes: ["Connecte les boites pro qui donnent des identifiants SMTP: Workspace, Zoho, OVH, SES, Microsoft 365."]
  },
  {
    provider: "mailgun",
    label: "Mailgun",
    envKeys: ["MAILGUN_API_KEY", "MAILGUN_DOMAIN", "MAILGUN_BASE_URL"],
    senderSetup: "api",
    dnsNotes: ["Utile pour domaines verifies, webhooks, routage entrant et volume technique."]
  }
];
