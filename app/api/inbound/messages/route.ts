import { NextResponse } from "next/server";
import { adminForbiddenResponse, isAdminRequest } from "@/lib/admin/access";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return adminForbiddenResponse();
  }

  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organizationId");

  if (!organizationId) {
    return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  }

  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("inbound_messages")
    .select("id,conversation_id,from_email,to_email,subject,html_body,text_body,received_at")
    .eq("organization_id", organizationId)
    .order("received_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: data ?? [] });
}
