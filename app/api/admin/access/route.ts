import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/access";

export function GET(request: Request) {
  return NextResponse.json({ authenticated: isAdminRequest(request) });
}
