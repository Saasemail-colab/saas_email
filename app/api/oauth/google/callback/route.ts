import { NextResponse } from "next/server";
import { encryptCredential } from "@/lib/security/credentials";
import { exchangeGoogleCode, getGoogleUserInfo, verifyGoogleState } from "@/lib/google/oauth";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim() || requestUrl.origin;
  const error = requestUrl.searchParams.get("error");
  const code = requestUrl.searchParams.get("code");
  const stateValue = requestUrl.searchParams.get("state");

  try {
    if (error) {
      throw new Error(`Google OAuth refused: ${error}`);
    }

    if (!code || !stateValue) {
      throw new Error("Google OAuth callback is missing code or state.");
    }

    const state = verifyGoogleState(stateValue);
    const token = await exchangeGoogleCode({ code, origin: requestUrl.origin });

    if (!token.access_token || !token.refresh_token) {
      throw new Error("Google did not return a refresh token. Reconnect Gmail and accept the consent screen.");
    }

    const googleUser = await getGoogleUserInfo(token.access_token);
    const email = googleUser.email.toLowerCase();
    const domainName = email.split("@")[1];
    const supabase = getServerSupabase();

    await supabase
      .from("organizations")
      .upsert({ id: state.organizationId, name: "Organisation EmailOps", plan: "starter", status: "active" }, { onConflict: "id" });

    const { data: domain, error: domainError } = await supabase
      .from("domains")
      .upsert({ organization_id: state.organizationId, domain: domainName, status: "verified" }, { onConflict: "organization_id,domain" })
      .select("id")
      .single();

    if (domainError || !domain) {
      throw new Error(domainError?.message ?? "Unable to register Gmail domain.");
    }

    const accountName = `gmail:${email}`;
    const { data: providerAccount, error: providerAccountError } = await supabase
      .from("email_provider_accounts")
      .upsert(
        {
          organization_id: state.organizationId,
          name: accountName,
          provider: "gmail_oauth",
          status: "active",
          config: {
            email,
            googleSubject: googleUser.sub,
            scope: token.scope,
            encryptedRefreshToken: encryptCredential(token.refresh_token)
          }
        },
        { onConflict: "organization_id,name" }
      )
      .select("id")
      .single();

    if (providerAccountError || !providerAccount) {
      throw new Error(providerAccountError?.message ?? "Unable to save Gmail provider account.");
    }

    const { error: senderError } = await supabase
      .from("sender_identities")
      .upsert(
        {
          organization_id: state.organizationId,
          domain_id: domain.id,
          provider_account_id: providerAccount.id,
          email,
          display_name: googleUser.name ?? email,
          status: "verified"
        },
        { onConflict: "organization_id,email" }
      );

    if (senderError) {
      throw new Error(senderError.message);
    }

    const redirectUrl = new URL(state.returnTo || "/#send", appOrigin);
    redirectUrl.searchParams.set("gmail", "connected");
    redirectUrl.searchParams.set("email", email);

    return NextResponse.redirect(redirectUrl);
  } catch (callbackError) {
    const redirectUrl = new URL("/#send", appOrigin);
    redirectUrl.searchParams.set("gmail_error", callbackError instanceof Error ? callbackError.message : "Google OAuth failed.");

    return NextResponse.redirect(redirectUrl);
  }
}
