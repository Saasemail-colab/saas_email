import { NextResponse } from "next/server";
import { z } from "zod";
import { EMAIL_PROVIDER_NAMES } from "@/lib/email/provider";
import { setupSenderDomain } from "@/lib/email/provider-setup";
import { getServerSupabase } from "@/lib/supabase/server";

const registerSenderSchema = z.object({
  organizationId: z.string().uuid(),
  provider: z.enum(EMAIL_PROVIDER_NAMES).default("resend"),
  email: z.string().email(),
  displayName: z.string().min(1).max(80).optional(),
  configureProvider: z.boolean().default(true)
});

export async function POST(request: Request) {
  const parsed = registerSenderSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;
  const domainName = payload.email.split("@")[1].toLowerCase();
  const supabase = getServerSupabase();
  const providerSetup = payload.configureProvider
    ? await setupSenderDomain(payload.provider, domainName).catch((error) => ({
        provider: payload.provider,
        status: "manual" as const,
        message: error instanceof Error ? error.message : "Provider setup failed."
      }))
    : {
        provider: payload.provider,
        status: "skipped" as const,
        message: "Provider setup skipped."
      };

  const { data: existingDomain } = await supabase
    .from("domains")
    .select("id,domain,status")
    .eq("organization_id", payload.organizationId)
    .eq("domain", domainName)
    .maybeSingle();

  const domainStatus = existingDomain?.status === "verified" ? "verified" : "pending";

  const { data: domain, error: domainError } = await supabase
    .from("domains")
    .upsert(
      {
        organization_id: payload.organizationId,
        domain: domainName,
        status: domainStatus
      },
      { onConflict: "organization_id,domain" }
    )
    .select("id,domain,status")
    .single();

  if (domainError || !domain) {
    return NextResponse.json({ error: "Unable to register domain." }, { status: 500 });
  }

  const { data: existingSender } = await supabase
    .from("sender_identities")
    .select("id,email,status")
    .eq("organization_id", payload.organizationId)
    .eq("email", payload.email.toLowerCase())
    .maybeSingle();

  const senderStatus = existingSender?.status === "verified" ? "verified" : "pending";

  const { data: sender, error: senderError } = await supabase
    .from("sender_identities")
    .upsert(
      {
        organization_id: payload.organizationId,
        domain_id: domain.id,
        email: payload.email.toLowerCase(),
        display_name: payload.displayName ?? null,
        status: senderStatus
      },
      { onConflict: "organization_id,email" }
    )
    .select("id,email,display_name,status")
    .single();

  if (senderError || !sender) {
    return NextResponse.json({ error: "Unable to register sender." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    domain,
    sender,
    providerSetup,
    nextStep: "Verify this domain in your email provider and DNS, then set domain and sender status to verified."
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organizationId");

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("sender_identities")
    .select("id,email,display_name,status,domains(domain,status)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Unable to list senders." }, { status: 500 });
  }

  return NextResponse.json({ senders: data ?? [] });
}
