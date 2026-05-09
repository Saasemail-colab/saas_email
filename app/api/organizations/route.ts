import { NextResponse } from "next/server";
import { z } from "zod";
import { adminForbiddenResponse, isAdminRequest } from "@/lib/admin/access";
import { getServerSupabase } from "@/lib/supabase/server";

const organizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120)
});

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return adminForbiddenResponse();
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("organizations")
    .select("id,name,plan,status")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Unable to list organizations." }, { status: 500 });
  }

  return NextResponse.json({ organizations: data ?? [] });
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return adminForbiddenResponse();
  }

  const parsed = organizationSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    const details = parsed.error.flatten();
    const fieldErrors = Object.entries(details.fieldErrors).flatMap(([field, errors]) => (errors ?? []).map((error) => `${field}: ${error}`));
    return NextResponse.json({ error: fieldErrors.length ? `Payload invalide. ${fieldErrors.join(" | ")}` : "Payload invalide." }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("organizations")
    .upsert(
      {
        id: parsed.data.id,
        name: parsed.data.name,
        plan: "starter",
        status: "active"
      },
      { onConflict: "id" }
    )
    .select("id,name,plan,status")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Unable to save organization." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, organization: data });
}
