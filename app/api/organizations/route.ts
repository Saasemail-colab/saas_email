import { NextResponse } from "next/server";
import { z } from "zod";
import { adminForbiddenResponse, isAdminRequest } from "@/lib/admin/access";
import { getServerSupabase } from "@/lib/supabase/server";

const organizationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120)
});

export async function GET(request: Request) {
  try {
    if (!isAdminRequest(request)) {
      return adminForbiddenResponse();
    }

    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from("organizations")
      .select("id,name,plan,status,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ organizations: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected organization list error." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!isAdminRequest(request)) {
      return adminForbiddenResponse();
    }

    const parsed = organizationSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
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
      .select("id,name,plan,status,created_at")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to save organization." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, organization: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected organization save error." },
      { status: 500 }
    );
  }
}
