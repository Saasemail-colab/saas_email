import { NextResponse } from "next/server";
import { z } from "zod";
import { adminForbiddenResponse, isAdminRequest } from "@/lib/admin/access";
import { buildGoogleAuthUrl } from "@/lib/google/oauth";

const startSchema = z.object({
  organizationId: z.string().uuid(),
  returnTo: z.string().optional()
});

export function GET(request: Request) {
  try {
    if (!isAdminRequest(request)) {
      return adminForbiddenResponse();
    }

    const url = new URL(request.url);
    const parsed = startSchema.safeParse({
      organizationId: url.searchParams.get("organizationId"),
      returnTo: url.searchParams.get("returnTo") ?? "/#send"
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
    }

    return NextResponse.redirect(
      buildGoogleAuthUrl({
        origin: url.origin,
        organizationId: parsed.data.organizationId,
        returnTo: parsed.data.returnTo ?? "/#send"
      })
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to start Google OAuth." },
      { status: 500 }
    );
  }
}
