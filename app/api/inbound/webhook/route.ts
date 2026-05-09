import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

const inboundSchema = z.object({
  organizationId: z.string().uuid().optional(),
  from: z.string().email(),
  to: z.string().email(),
  subject: z.string().optional().default("Sans sujet"),
  html: z.string().optional(),
  text: z.string().optional()
});

export async function POST(request: Request) {
  const expectedSecret = process.env.INBOUND_WEBHOOK_SECRET?.trim();

  if (expectedSecret) {
    const providedSecret = request.headers.get("x-inbound-secret") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Invalid inbound webhook secret." }, { status: 401 });
    }
  }

  const payload = await readInboundPayload(request);
  const parsed = inboundSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid inbound payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const organizationId =
    parsed.data.organizationId ??
    process.env.NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID ??
    "00000000-0000-0000-0000-000000000001";
  const supabase = getServerSupabase();

  await supabase
    .from("organizations")
    .upsert({ id: organizationId, name: "Organisation EmailOps", plan: "starter", status: "active" }, { onConflict: "id" });

  const { data: conversation, error: conversationError } = await supabase
    .from("inbound_conversations")
    .insert({ organization_id: organizationId, subject: parsed.data.subject, status: "open" })
    .select("id")
    .single();

  if (conversationError || !conversation) {
    return NextResponse.json({ error: conversationError?.message ?? "Unable to create inbound conversation." }, { status: 500 });
  }

  const { data: message, error: messageError } = await supabase
    .from("inbound_messages")
    .insert({
      organization_id: organizationId,
      conversation_id: conversation.id,
      from_email: parsed.data.from.toLowerCase(),
      to_email: parsed.data.to.toLowerCase(),
      subject: parsed.data.subject,
      html_body: parsed.data.html ?? null,
      text_body: parsed.data.text ?? null
    })
    .select("id")
    .single();

  if (messageError || !message) {
    return NextResponse.json({ error: messageError?.message ?? "Unable to save inbound message." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, conversationId: conversation.id, messageId: message.id });
}

async function readInboundPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  if (contentType.includes("form")) {
    const formData = await request.formData();
    return {
      organizationId: formData.get("organizationId")?.toString(),
      from: formData.get("from")?.toString() ?? formData.get("sender")?.toString(),
      to: formData.get("to")?.toString() ?? formData.get("recipient")?.toString(),
      subject: formData.get("subject")?.toString(),
      html: formData.get("html")?.toString() ?? formData.get("body-html")?.toString(),
      text: formData.get("text")?.toString() ?? formData.get("body-plain")?.toString()
    };
  }

  return {};
}
