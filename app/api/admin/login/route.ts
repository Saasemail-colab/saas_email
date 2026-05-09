import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, createAdminSession, isValidAdminCode } from "@/lib/admin/access";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { code?: string };

  if (!body.code || !isValidAdminCode(body.code)) {
    return NextResponse.json({ error: "Code admin invalide." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, await createAdminSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });

  return response;
}
