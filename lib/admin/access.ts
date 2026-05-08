import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export const ADMIN_COOKIE_NAME = "emailops_admin";

function getAdminCode() {
  return process.env.ADMIN_ACCESS_CODE?.trim();
}

function getAdminSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() ?? process.env.CREDENTIAL_ENCRYPTION_KEY?.trim() ?? getAdminCode();
}

export function isAdminAccessConfigured() {
  return Boolean(getAdminCode());
}

export function verifyAdminCode(code: string) {
  const expected = getAdminCode();

  if (!expected) {
    throw new Error("ADMIN_ACCESS_CODE is missing.");
  }

  const providedBuffer = Buffer.from(code.trim());
  const expectedBuffer = Buffer.from(expected);

  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

export function createAdminSessionToken() {
  const secret = getAdminSecret();

  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET or ADMIN_ACCESS_CODE is required.");
  }

  return createHmac("sha256", secret).update("emailops-admin-session").digest("base64url");
}

export function isAdminRequest(request: Request) {
  if (!isAdminAccessConfigured()) {
    return false;
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value)
  );
  const token = cookies[ADMIN_COOKIE_NAME];

  return Boolean(token && token === createAdminSessionToken());
}

export function adminForbiddenResponse() {
  return NextResponse.json({ error: "Admin access code required." }, { status: 401 });
}
