import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

const verifySenderSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email()
});

export async function POST(request: Request) {
  try {
    const parsed = verifySenderSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const domainName = payload.email.split("@")[1].toLowerCase();
    const supabase = getServerSupabase();

  const { data: domain, error: domainError } = await supabase
    .from("domains")
    .update({ status: "verified" })
    .eq("organization_id", payload.organizationId)
    .eq("domain", domainName)
    .select("id,domain,status")
    .single();

  if (domainError || !domain) {
    return NextResponse.json({ error: "Domain not found." }, { status: 404 });
  }

  const { data: sender, error: senderError } = await supabase
    .from("sender_identities")
    .update({ status: "verified", domain_id: domain.id })
    .eq("organization_id", payload.organizationId)
    .eq("email", payload.email.toLowerCase())
    .select("id,email,display_name,status")
    .single();

  if (senderError || !sender) {
    return NextResponse.json({ error: "Sender not found." }, { status: 404 });
  }

    return NextResponse.json({
      ok: true,
      domain,
      sender,
      message: "Sender marked as verified locally. The email provider may still reject sends if its own verification is incomplete."
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected sender verification error." },
      { status: 500 }
    );
  }
}
