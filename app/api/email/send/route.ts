import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail } from "@/lib/email/provider";
import { getServerSupabase } from "@/lib/supabase/server";

const sendEmailSchema = z.object({
  organizationId: z.string().uuid(),
  from: z.string().email(),
  to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
  subject: z.string().min(1).max(200),
  html: z.string().min(1),
  text: z.string().optional(),
  audience: z.enum(["transactional", "marketing"]).default("transactional"),
  replyTo: z.string().email().optional()
});

export async function POST(request: Request) {
  const parsed = sendEmailSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const recipients = Array.isArray(payload.to) ? payload.to : [payload.to];
  const supabase = getServerSupabase();

  const { data: sender, error: senderError } = await supabase
    .from("sender_identities")
    .select("id,email,status,organization_id")
    .eq("organization_id", payload.organizationId)
    .eq("email", payload.from)
    .eq("status", "verified")
    .single();

  if (senderError || !sender) {
    return NextResponse.json(
      { error: "Sender identity is not verified for this organization." },
      { status: 403 }
    );
  }

  const domain = payload.from.split("@")[1];
  const { data: verifiedDomain } = await supabase
    .from("domains")
    .select("id,status")
    .eq("organization_id", payload.organizationId)
    .eq("domain", domain)
    .eq("status", "verified")
    .single();

  if (!verifiedDomain) {
    return NextResponse.json(
      { error: "Sender domain is not verified for this organization." },
      { status: 403 }
    );
  }

  const { data: suppressedRecipients } = await supabase
    .from("contact_suppressions")
    .select("email")
    .eq("organization_id", payload.organizationId)
    .in("email", recipients);

  if (suppressedRecipients?.length) {
    return NextResponse.json(
      {
        error: "One or more recipients are unsubscribed or suppressed.",
        recipients: suppressedRecipients.map((recipient) => recipient.email)
      },
      { status: 409 }
    );
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
      provider: process.env.EMAIL_PROVIDER ?? "resend"
    })
    .select("id")
    .single();

  if (messageError || !message) {
    return NextResponse.json({ error: "Unable to create message." }, { status: 500 });
  }

  await supabase.from("email_recipients").insert(
    recipients.map((recipient) => ({
      message_id: message.id,
      email: recipient,
      kind: "to",
      status: "queued"
    }))
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const unsubscribeUrl =
    payload.audience === "marketing"
      ? `${appUrl}/api/unsubscribe?organizationId=${payload.organizationId}&email=${encodeURIComponent(
          recipients[0]
        )}`
      : undefined;

  let result;

  try {
    result = await sendEmail({
      from: payload.from,
      to: recipients,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo,
      headers: unsubscribeUrl
        ? {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
          }
        : undefined
    });
  } catch (error) {
    await supabase
      .from("email_messages")
      .update({ status: "failed" })
      .eq("id", message.id);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Email provider failed." },
      { status: 502 }
    );
  }

  await supabase
    .from("email_messages")
    .update({
      status: "sent",
      provider: result.provider,
      provider_message_id: result.providerMessageId ?? null,
      sent_at: new Date().toISOString()
    })
    .eq("id", message.id);

  return NextResponse.json({
    ok: true,
    messageId: message.id,
    provider: result.provider,
    providerMessageId: result.providerMessageId
  });
}
