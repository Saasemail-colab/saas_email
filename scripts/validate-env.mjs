import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.argv[2] ?? ".env");

if (!existsSync(envPath)) {
  console.error(`Fichier introuvable: ${envPath}`);
  process.exit(1);
}

const env = parseEnv(readFileSync(envPath, "utf8"));
const checks = [];

checkRequired("NEXT_PUBLIC_SUPABASE_URL", isHttpUrl, "URL Supabase presente", "doit ressembler a https://xxxx.supabase.co");
checkRequired("NEXT_PUBLIC_SUPABASE_ANON_KEY", Boolean, "cle anon presente", "cle anon publique Supabase manquante");
checkRequired("SUPABASE_SERVICE_ROLE_KEY", Boolean, "cle service_role presente", "cle service_role Supabase manquante");
checkRequired("SUPABASE_DB_URL", isPostgresUrl, "URL Postgres presente", "URL Postgres Supabase invalide");
checkRequired("ADMIN_ACCESS_CODE", Boolean, "code admin present", "code admin manquant");
checkRequired("ADMIN_SESSION_SECRET", (value) => value.length >= 24, "secret admin present", "secret admin trop court");

const provider = env.EMAIL_PROVIDER || "auto";
const allowedProviders = ["auto", "gmail_smtp", "gmail_oauth", "resend"];
checks.push({
  name: "EMAIL_PROVIDER",
  ok: allowedProviders.includes(provider),
  message: allowedProviders.includes(provider)
    ? `provider ${provider}`
    : `valeur invalide: ${provider}. Valeurs: ${allowedProviders.join(", ")}`
});

if (provider === "resend" || provider === "auto") {
  checkOptional("RESEND_API_KEY", (value) => value.startsWith("re_"), "cle Resend presente", "cle Resend attendue: re_xxxxx");
}

if (provider === "gmail_smtp" || provider === "auto") {
  checkOptional("GMAIL_SMTP_USER", isEmail, "adresse Gmail presente", "adresse Gmail invalide");
  checkOptional("GMAIL_SMTP_PASS", (value) => value.replace(/\s+/g, "").length >= 16, "mot de passe application Gmail present", "mot de passe application Gmail trop court");
}

if (provider === "gmail_oauth" || provider === "auto") {
  checkOptional("GOOGLE_CLIENT_ID", (value) => value.endsWith(".apps.googleusercontent.com"), "client id Google present", "client id Google invalide");
  checkOptional("GOOGLE_CLIENT_SECRET", Boolean, "client secret Google present", "client secret Google manquant");
  checkOptional("GOOGLE_REDIRECT_URI", isHttpUrl, "redirect URI Google presente", "redirect URI Google invalide");
  checkOptional("GOOGLE_OAUTH_STATE_SECRET", (value) => value.length >= 24, "state secret present", "state secret trop court");
  checkOptional("CREDENTIAL_ENCRYPTION_KEY", (value) => value.length >= 24, "cle de chiffrement presente", "cle de chiffrement trop courte");
}

const dbUrl = env.SUPABASE_DB_URL;
if (dbUrl) {
  const atCount = (dbUrl.match(/@/g) ?? []).length;
  checks.push({
    name: "SUPABASE_DB_URL @",
    ok: atCount === 1,
    message:
      atCount === 1
        ? "separateur @ correct"
        : "il doit rester exactement un @ avant le host; encode les @ du mot de passe en %40"
  });

  checks.push({
    name: "SUPABASE_DB_URL user",
    ok: /^postgresql:\/\/postgres\.[^:]+:/.test(dbUrl),
    message: "avec le pooler Supabase, l'utilisateur doit etre postgres.PROJECT_REF"
  });
}

const failed = checks.filter((check) => !check.ok);

for (const check of checks) {
  console.log(`${check.ok ? "OK" : "ERREUR"} ${check.name}: ${check.message}`);
}

if (failed.length) {
  process.exit(1);
}

function parseEnv(content) {
  const result = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const index = line.indexOf("=");

    if (index < 1) {
      continue;
    }

    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    result[key] = value;
  }

  return result;
}

function checkRequired(name, validate, successMessage, failureMessage) {
  const value = env[name];
  const ok = Boolean(value) && Boolean(validate(value));

  checks.push({
    name,
    ok,
    message: ok ? successMessage : value ? failureMessage : "variable manquante"
  });
}

function checkOptional(name, validate, successMessage, failureMessage) {
  const value = env[name];
  const ok = Boolean(value) && Boolean(validate(value));

  checks.push({
    name,
    ok,
    message: ok ? successMessage : value ? failureMessage : "variable manquante"
  });
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isPostgresUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "postgresql:" || url.protocol === "postgres:";
  } catch {
    return false;
  }
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
