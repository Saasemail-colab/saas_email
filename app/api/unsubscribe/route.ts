import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organizationId");
  const email = url.searchParams.get("email");

  if (!organizationId || !email) {
    return NextResponse.json({ error: "organizationId and email are required." }, { status: 400 });
  }

  const supabase = getServerSupabase();
  await supabase
    .from("contact_suppressions")
    .upsert({ organization_id: organizationId, email: email.toLowerCase(), reason: "unsubscribe" }, { onConflict: "organization_id,email" });

  return NextResponse.json({ ok: true, message: "Adresse desinscrite." });
}
