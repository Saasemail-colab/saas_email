import { NextResponse } from "next/server";
import { adminForbiddenResponse, isAdminRequest } from "@/lib/admin/access";
import { getAvailableProviders, type ConcreteEmailProviderName } from "@/lib/email/provider";
import { PROVIDER_CATALOG } from "@/lib/email/provider-catalog";

export function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return adminForbiddenResponse();
  }

  const available = getAvailableProviders();

  return NextResponse.json({
    available,
    providers: PROVIDER_CATALOG.map((entry) => {
      const provider = entry.provider;

      return {
      provider,
      catalog: entry,
      configured:
        provider === "auto"
          ? available.length > 0
          : available.includes(provider as ConcreteEmailProviderName),
      note:
        provider === "auto"
          ? "Auto essaie les providers configures dans l'ordre recommande."
        : providerNote(provider)
      };
    })
  });
}

function providerNote(provider: string) {
  if (provider === "resend") {
    return "Necessite RESEND_API_KEY.";
  }

  if (provider === "gmail_smtp") {
    return "Necessite GMAIL_SMTP_USER et GMAIL_SMTP_PASS.";
  }

  if (provider === "smtp") {
    return "Necessite SMTP_HOST, SMTP_USER et SMTP_PASS.";
  }

  if (provider === "mailgun") {
    return "Necessite MAILGUN_API_KEY et MAILGUN_DOMAIN.";
  }

  if (provider === "gmail_oauth") {
    return "Necessite GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et CREDENTIAL_ENCRYPTION_KEY. Les comptes Gmail se connectent ensuite par OAuth.";
  }

  return "";
}
