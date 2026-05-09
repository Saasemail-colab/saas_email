import { NextResponse } from "next/server";
import { z } from "zod";
import { adminForbiddenResponse, isAdminRequest } from "@/lib/admin/access";
import { getServerSupabase } from "@/lib/supabase/server";

const verifySchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email()
});

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return adminForbiddenResponse();
  }

  const parsed = verifySchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const domainName = email.split("@")[1];
  const supabase = getServerSupabase();

  const { data: domain, error: domainError } = await supabase
    .from("domains")
    .upsert(
      { organization_id: parsed.data.organizationId, domain: domainName, status: "verified" },
      { onConflict: "organization_id,domain" }
    )
    .select("id,domain,status")
    .single();

  if (domainError || !domain) {
    return NextResponse.json({ error: "Unable to verify domain." }, { status: 500 });
  }

  const { data: sender, error: senderError } = await supabase
    .from("sender_identities")
    .update({ status: "verified", domain_id: domain.id })
    .eq("organization_id", parsed.data.organizationId)
    .eq("email", email)
    .select("id,email,display_name,status")
    .single();

  if (senderError || !sender) {
    return NextResponse.json({ error: "Unable to verify sender." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, domain, sender });
}
