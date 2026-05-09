export function getDatabaseUrl() {
  return normalizeDatabaseUrl(
    process.env.SUPABASE_DB_URL ??
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL
  );
}

export function getDatabaseUrlSource() {
  if (process.env.SUPABASE_DB_URL?.trim()) {
    return "SUPABASE_DB_URL";
  }

  if (process.env.DIRECT_URL?.trim()) {
    return "DIRECT_URL";
  }

  if (process.env.DATABASE_URL?.trim()) {
    return "DATABASE_URL";
  }

  return null;
}

export function normalizeDatabaseUrl(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const cleaned = trimmed
    .replace(/^DATABASE_URL=/, "")
    .replace(/^DIRECT_URL=/, "")
    .replace(/^SUPABASE_DB_URL=/, "")
    .replace(/^['"]|['"]$/g, "")
    .replace(/\s+/g, "");

  try {
    return new URL(cleaned).href;
  } catch {
    return cleaned;
  }
}

export function formatDatabaseError(message: string) {
  if (message.includes("password authentication failed")) {
    return "Connexion Supabase refusee: le mot de passe ou l'utilisateur dans SUPABASE_DB_URL est incorrect. Avec le pooler, utilise postgres.PROJECT_REF et le database password Supabase.";
  }

  if (message.includes("ENOTFOUND") || message.includes("getaddrinfo")) {
    return "Connexion Supabase impossible: l'hote Postgres dans l'URL est incorrect.";
  }

  if (message.includes("Tenant or user not found")) {
    return "Connexion Supabase refusee: l'identifiant postgres du projet est incorrect.";
  }

  if (message.includes("SASL") || message.includes("SCRAM")) {
    return "Connexion Supabase refusee: l'URL contient probablement un mot de passe mal encode. Remplace @ par %40.";
  }

  return message;
}
