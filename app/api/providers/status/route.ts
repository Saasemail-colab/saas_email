import { NextResponse } from "next/server";
import { EMAIL_PROVIDER_NAMES, getAvailableProviders, isEmailProviderName } from "@/lib/email/provider";

export function GET() {
  const available = getAvailableProviders();

  return NextResponse.json({
    available,
    providers: EMAIL_PROVIDER_NAMES.map((provider) => ({
      provider,
      configured:
        provider === "auto"
          ? available.length > 0
          : isEmailProviderName(provider) && available.includes(provider),
      note:
        provider === "auto"
          ? "Auto essaie les providers configures dans l'ordre recommande."
          : providerNote(provider)
    }))
  });
}

function providerNote(provider: string) {
  if (provider === "resend") {
    return "Necessite RESEND_API_KEY.";
  }

  if (provider === "smtp") {
    return "Necessite SMTP_HOST, SMTP_USER et SMTP_PASS.";
  }

  if (provider === "sendgrid") {
    return "Necessite SENDGRID_API_KEY.";
  }

  if (provider === "mailgun") {
    return "Necessite MAILGUN_API_KEY et MAILGUN_DOMAIN.";
  }

  if (provider === "postmark") {
    return "Necessite POSTMARK_SERVER_TOKEN.";
  }

  if (provider === "brevo") {
    return "Necessite BREVO_API_KEY.";
  }

  if (provider === "mailersend") {
    return "Necessite MAILERSEND_API_KEY.";
  }

  return "";
}
