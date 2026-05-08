import { NextResponse } from "next/server";
import { isAdminAccessConfigured, isAdminRequest } from "@/lib/admin/access";

export function GET(request: Request) {
  return NextResponse.json({
    configured: isAdminAccessConfigured(),
    authenticated: isAdminRequest(request)
  });
}
