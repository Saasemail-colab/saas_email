import { createHmac, timingSafeEqual } from "crypto";

export const GOOGLE_GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
export const GOOGLE_OAUTH_SCOPES = ["openid", "email", "profile", GOOGLE_GMAIL_SEND_SCOPE];

type GoogleState = {
  organizationId: string;
  returnTo: string;
  createdAt: number;
};

function getGoogleClientId() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is missing.");
  }

  return clientId;
}

function getGoogleClientSecret() {
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientSecret) {
    throw new Error("GOOGLE_CLIENT_SECRET is missing.");
  }

  return clientSecret;
}

function getStateSecret() {
  const secret =
    process.env.GOOGLE_OAUTH_STATE_SECRET?.trim() ??
    process.env.CREDENTIAL_ENCRYPTION_KEY?.trim() ??
    process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!secret) {
    throw new Error("GOOGLE_OAUTH_STATE_SECRET or CREDENTIAL_ENCRYPTION_KEY is required.");
  }

  return secret;
}

export function getGoogleRedirectUri(origin: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const baseUrl = appUrl && isHttpUrl(appUrl) ? appUrl : origin;

  return process.env.GOOGLE_REDIRECT_URI?.trim() ?? `${baseUrl}/api/oauth/google/callback`;
}

export function createGoogleState(input: Omit<GoogleState, "createdAt">) {
  const payload = Buffer.from(JSON.stringify({ ...input, createdAt: Date.now() }), "utf8").toString("base64url");
  const signature = createHmac("sha256", getStateSecret()).update(payload).digest("base64url");

  return `${payload}.${signature}`;
}

export function verifyGoogleState(value: string): GoogleState {
  const [payload, signature] = value.split(".");

  if (!payload || !signature) {
    throw new Error("Invalid OAuth state.");
  }

  const expected = createHmac("sha256", getStateSecret()).update(payload).digest("base64url");
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw new Error("Invalid OAuth state signature.");
  }

  const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GoogleState;
  const maxAgeMs = 10 * 60 * 1000;

  if (!state.organizationId || Date.now() - state.createdAt > maxAgeMs) {
    throw new Error("OAuth state expired.");
  }

  return state;
}

export function buildGoogleAuthUrl(input: { origin: string; organizationId: string; returnTo: string }) {
  const redirectUri = getGoogleRedirectUri(input.origin);
  const state = createGoogleState({
    organizationId: input.organizationId,
    returnTo: input.returnTo
  });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", getGoogleClientId());
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_OAUTH_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);

  return url;
}

export async function exchangeGoogleCode(input: { code: string; origin: string }) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: input.code,
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      redirect_uri: getGoogleRedirectUri(input.origin),
      grant_type: "authorization_code"
    })
  });

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    scope?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Unable to exchange Google OAuth code.");
  }

  return data;
}

export async function getGoogleUserInfo(accessToken: string): Promise<{
  sub?: string;
  email: string;
  email_verified?: boolean;
  name?: string;
}> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const data = (await response.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    error?: string;
  };

  if (!response.ok || !data.email) {
    throw new Error(data.error ?? "Unable to read Google user info.");
  }

  if (!data.email_verified) {
    throw new Error("Google account email is not verified.");
  }

  return {
    sub: data.sub,
    email: data.email,
    email_verified: data.email_verified,
    name: data.name
  };
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
