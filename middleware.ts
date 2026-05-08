import { NextResponse, type NextRequest } from "next/server";

const ADMIN_COOKIE_NAME = "emailops_admin";

const PUBLIC_PATHS = [
  "/",
  "/confidentialite",
  "/admin-login",
  "/api/admin/access",
  "/api/admin/login",
  "/api/admin/logout",
  "/api/admin/session",
  "/api/health",
  "/api/oauth/google/callback"
];

export async function middleware(request: NextRequest) {
  const adminCode = process.env.ADMIN_ACCESS_CODE?.trim();
  const pathname = request.nextUrl.pathname;

  if (!adminCode || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const expectedToken = await createAdminSessionToken();
  const hasAccess = request.cookies.get(ADMIN_COOKIE_NAME)?.value === expectedToken;

  if (hasAccess) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Acces admin requis." }, { status: 401 });
  }

  const loginUrl = new URL("/admin-login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon")
  );
}

async function createAdminSessionToken() {
  const secret =
    process.env.ADMIN_SESSION_SECRET?.trim() ??
    process.env.CREDENTIAL_ENCRYPTION_KEY?.trim() ??
    process.env.ADMIN_ACCESS_CODE?.trim();

  if (!secret) {
    return "";
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("emailops-admin-session"));
  return base64Url(new Uint8Array(signature));
}

function base64Url(bytes: Uint8Array) {
  let value = "";

  bytes.forEach((byte) => {
    value += String.fromCharCode(byte);
  });

  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
