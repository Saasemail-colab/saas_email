import { readFile } from "fs/promises";
import path from "path";
import { Client } from "pg";
import { NextResponse } from "next/server";
import { adminForbiddenResponse, isAdminRequest } from "@/lib/admin/access";
import { formatDatabaseError, getDatabaseUrl, getDatabaseUrlSource } from "@/lib/supabase/database-url";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return adminForbiddenResponse();
  }

  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    return NextResponse.json(
      { error: "Database URL is missing. Add SUPABASE_DB_URL, DIRECT_URL, or DATABASE_URL on Render, then redeploy." },
      { status: 500 }
    );
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false }
  });

  try {
    const schemaPath = path.join(process.cwd(), "supabase", "deploy.sql");
    const schemaSql = await readFile(schemaPath, "utf8");

    await client.connect();
    await client.query("select 1");
    await client.query(schemaSql);

    return NextResponse.json({
      ok: true,
      message: "Schema Supabase installe ou mis a jour.",
      source: getDatabaseUrlSource()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to install Supabase schema.";

    return NextResponse.json(
      {
        error: formatDatabaseError(message),
        detail: message,
        source: getDatabaseUrlSource()
      },
      { status: 500 }
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}
