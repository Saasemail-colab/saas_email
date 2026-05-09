import { NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, isValidAdminSession, readCookie } from "@/lib/admin/access";

export async function GET(request: Request) {
  const authenticated = await isValidAdminSession(readCookie(request, ADMIN_COOKIE_NAME));
  return NextResponse.json({ authenticated });
}
