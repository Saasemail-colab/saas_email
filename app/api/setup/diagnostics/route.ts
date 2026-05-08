import { Client } from "pg";
import { NextResponse } from "next/server";
import { adminForbiddenResponse, isAdminRequest } from "@/lib/admin/access";
import { getServerSupabase, hasSupabaseServerEnv } from "@/lib/supabase/server";
import { formatDatabaseError, getDatabaseUrl, getDatabaseUrlSource } from "@/lib/supabase/database-url";

export const runtime = "nodejs";

type Check = {
  name: string;
  ok: boolean;
  message: string;
  detail?: string;
};

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return adminForbiddenResponse();
  }

  const checks: Check[] = [];

  checks.push({
    name: "NEXT_PUBLIC_SUPABASE_URL",
    ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
    message: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ? "Variable presente." : "Variable manquante."
  });

  checks.push({
    name: "SUPABASE_SERVICE_ROLE_KEY",
    ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    message: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ? "Variable presente." : "Variable manquante."
  });

  const databaseUrl = getDatabaseUrl();
  checks.push({
    name: "Database URL",
    ok: Boolean(databaseUrl),
    message: databaseUrl ? `Variable presente via ${getDatabaseUrlSource()}.` : "SUPABASE_DB_URL, DIRECT_URL ou DATABASE_URL manquante."
  });

  if (hasSupabaseServerEnv()) {
    try {
      const supabase = getServerSupabase();
      const { error } = await supabase.from("domains").select("id").limit(1);

      checks.push({
        name: "Supabase REST",
        ok: !error,
        message: error ? "REST Supabase joignable mais table domains indisponible." : "REST Supabase connecte et table domains disponible.",
        detail: error?.message
      });
    } catch (error) {
      checks.push({
        name: "Supabase REST",
        ok: false,
        message: "Connexion REST Supabase impossible.",
        detail: error instanceof Error ? error.message : "Unknown REST error"
      });
    }
  }

  if (databaseUrl) {
    const client = new Client({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("localhost")
        ? false
        : {
            rejectUnauthorized: false
          }
    });

    try {
      await client.connect();
      await client.query("select 1");
      const tableResult = await client.query(
        "select exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'domains') as exists"
      );

      checks.push({
        name: "Postgres direct",
        ok: true,
        message: tableResult.rows[0]?.exists
          ? "Connexion Postgres OK et table domains presente."
          : "Connexion Postgres OK, mais table domains absente."
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown Postgres error";
      checks.push({
        name: "Postgres direct",
        ok: false,
        message: formatDatabaseError(detail),
        detail
      });
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  const ok = checks.every((check) => check.ok);

  return NextResponse.json({ ok, checks });
}
