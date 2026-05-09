import { NextResponse } from "next/server";

export const ADMIN_COOKIE_NAME = "emailops_admin";

function getAdminCode() {
  return process.env.ADMIN_ACCESS_CODE?.trim() || "admin-setup-required";
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || process.env.ADMIN_ACCESS_CODE?.trim() || "dev-session-secret";
}

async function sign(value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Buffer.from(signature).toString("base64url");
}

export async function createAdminSession() {
  const payload = Buffer.from(JSON.stringify({ createdAt: Date.now() }), "utf8").toString("base64url");
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

export async function isValidAdminSession(value?: string | null) {
  if (!value) {
    return false;
  }

  const [payload, signature] = value.split(".");

  if (!payload || !signature) {
    return false;
  }

  return signature === await sign(payload);
}

export function isValidAdminCode(code: string) {
  return code.trim() === getAdminCode();
}

export function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function adminForbiddenResponse() {
  return NextResponse.json({ error: "Acces admin requis." }, { status: 401 });
}

export function isAdminRequest(request: Request) {
  const cookieValue = readCookie(request, ADMIN_COOKIE_NAME);
  return Boolean(cookieValue);
}
