import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSupabase } from "@/lib/supabase/server";

const unsubscribeSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email()
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = unsubscribeSchema.safeParse({
    organizationId: url.searchParams.get("organizationId"),
    email: url.searchParams.get("email")
  });

  if (!parsed.success) {
    return new NextResponse("Lien de desabonnement invalide.", { status: 400 });
  }

  const supabase = getServerSupabase();

  await supabase.from("contact_suppressions").upsert(
    {
      organization_id: parsed.data.organizationId,
      email: parsed.data.email,
      reason: "unsubscribe",
      created_at: new Date().toISOString()
    },
    { onConflict: "organization_id,email" }
  );

  return new NextResponse("Vous etes desabonne. Vous ne recevrez plus d'emails marketing.", {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const formData = await request.formData().catch(() => null);
  const parsed = unsubscribeSchema.safeParse({
    organizationId: formData?.get("organizationId") ?? url.searchParams.get("organizationId"),
    email: formData?.get("email") ?? url.searchParams.get("email")
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid unsubscribe payload." }, { status: 400 });
  }

  const supabase = getServerSupabase();

  await supabase.from("contact_suppressions").upsert(
    {
      organization_id: parsed.data.organizationId,
      email: parsed.data.email,
      reason: "unsubscribe",
      created_at: new Date().toISOString()
    },
    { onConflict: "organization_id,email" }
  );

  return NextResponse.json({ ok: true });
}
