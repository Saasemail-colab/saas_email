import { NextResponse } from "next/server";
import { z } from "zod";
import { EMAIL_PROVIDER_NAMES, sendEmail, type SendEmailResult } from "@/lib/email/provider";
import { adminForbiddenResponse, isAdminRequest } from "@/lib/admin/access";
import { decryptCredential } from "@/lib/security/credentials";
import { getServerSupabase } from "@/lib/supabase/server";

const sendEmailSchema = z.object({
  organizationId: z.string().uuid(),
  provider: z.enum(EMAIL_PROVIDER_NAMES).optional(),
  from: z.string().email(),
  to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
  subject: z.string().min(1).max(200),
  html: z.string().min(1),
  text: z.string().optional(),
  audience: z.enum(["transactional", "marketing"]).default("transactional"),
  replyTo: z.string().email().optional()
});

type GmailProviderConfig = {
  encryptedRefreshToken?: string;
  email?: string;
};

export async function POST(request: Request) {
  try {
    if (!isAdminRequest(request)) {
      return adminForbiddenResponse();
    }

    const parsed = sendEmailSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
    }

    const payload = parsed.data;
    const fromEmail = payload.from.toLowerCase();
    const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
    const supabase = getServerSupabase();

    const { data: sender, error: senderError } = await supabase
      .from("sender_identities")
      .select("id,email,status,organization_id,provider_account_id")
      .eq("organization_id", payload.organizationId)
      .eq("email", fromEmail)
      .eq("status", "verified")
      .single();

    if (senderError || !sender) {
      return NextResponse.json({ error: "Sender identity is not verified for this organization." }, { status: 403 });
    }

    const domain = fromEmail.split("@")[1];
    const { data: verifiedDomain } = await supabase
      .from("domains")
      .select("id,status")
      .eq("organization_id", payload.organizationId)
      .eq("domain", domain)
      .eq("status", "verified")
      .single();

    if (!verifiedDomain) {
      return NextResponse.json({ error: "Sender domain is not verified for this organization." }, { status: 403 });
    }

    let gmailOAuth: { refreshToken: string; email: string } | undefined;

    if (sender.provider_account_id) {
      const { data: providerAccount } = await supabase
        .from("email_provider_accounts")
        .select("provider,status,config")
        .eq("id", sender.provider_account_id)
        .eq("organization_id", payload.organizationId)
        .single();

      gmailOAuth = extractGmailOAuth(providerAccount, fromEmail);
    }

    if (!gmailOAuth && domain === "gmail.com") {
      const { data: providerAccount } = await supabase
        .from("email_provider_accounts")
        .select("id,provider,status,config")
        .eq("organization_id", payload.organizationId)
        .eq("provider", "gmail_oauth")
        .eq("status", "active")
        .eq("name", `gmail:${fromEmail}`)
        .maybeSingle();

      gmailOAuth = extractGmailOAuth(providerAccount, fromEmail);

      if (gmailOAuth && providerAccount?.id && !sender.provider_account_id) {
        await supabase
          .from("sender_identities")
          .update({ provider_account_id: providerAccount.id })
          .eq("id", sender.id);
      }
    }

    const providerForSend = payload.provider === "auto" && gmailOAuth ? "gmail_oauth" : payload.provider;

    if (providerForSend === "gmail_oauth" && !gmailOAuth) {
      return NextResponse.json({ error: "This sender is not connected with Gmail OAuth. Connect Gmail first." }, { status: 403 });
    }

    const { data: message, error: messageError } = await supabase
      .from("email_messages")
      .insert({
        organization_id: payload.organizationId,
        sender_identity_id: sender.id,
        subject: payload.subject,
        html_body: payload.html,
        text_body: payload.text ?? null,
        status: "queued",
        provider: payload.provider ?? process.env.EMAIL_PROVIDER ?? "resend"
      })
      .select("id")
      .single();

    if (messageError || !message) {
      return NextResponse.json({ error: "Unable to create message." }, { status: 500 });
    }

    await supabase.from("email_recipients").insert(
      recipients.map((recipient) => ({ message_id: message.id, email: recipient, kind: "to", status: "queued" }))
    );

    const replyToEmail = process.env.INBOUND_REPLY_TO_EMAIL?.trim() || payload.replyTo || fromEmail;

    let result: SendEmailResult;

    try {
      result = await sendEmail({
        provider: providerForSend,
        from: fromEmail,
        to: recipients,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        replyTo: replyToEmail,
        gmailOAuth
      });
    } catch (error) {
      await supabase.from("email_messages").update({ status: "failed" }).eq("id", message.id);
      return NextResponse.json({ error: error instanceof Error ? error.message : "Email provider failed." }, { status: 502 });
    }

    await supabase
      .from("email_messages")
      .update({ status: "sent", provider: result.provider, provider_message_id: result.providerMessageId ?? null, sent_at: new Date().toISOString() })
      .eq("id", message.id);

    return NextResponse.json({ ok: true, messageId: message.id, provider: result.provider, providerMessageId: result.providerMessageId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected send error." }, { status: 500 });
  }
}
function extractGmailOAuth(providerAccount: { provider?: string; status?: string; config?: unknown } | null | undefined, fromEmail: string) {
  if (providerAccount?.provider !== "gmail_oauth" || providerAccount.status !== "active") {
    return undefined;
  }

  const config = providerAccount.config as GmailProviderConfig;

  if (!config?.encryptedRefreshToken) {
    return undefined;
  }

  return {
    refreshToken: decryptCredential(config.encryptedRefreshToken),
    email: config.email ?? fromEmail
  };
}
