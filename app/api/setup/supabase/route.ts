import { readFile } from "fs/promises";
import path from "path";
import { Client } from "pg";
import { NextResponse } from "next/server";
import { adminForbiddenResponse, isAdminRequest } from "@/lib/admin/access";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return adminForbiddenResponse();
  }

  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    return NextResponse.json(
      {
        error:
          "Database URL is missing. Add SUPABASE_DB_URL, DIRECT_URL, or DATABASE_URL on Render, then redeploy."
      },
      { status: 500 }
    );
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("localhost")
      ? false
      : {
          rejectUnauthorized: false
        }
  });

  try {
    const schemaPath = path.join(process.cwd(), "supabase", "deploy.sql");
    const schemaSql = await readFile(schemaPath, "utf8");

    await client.connect();
    await client.query(schemaSql);

    return NextResponse.json({
      ok: true,
      message: "Schema Supabase installe ou mis a jour.",
      source: getDatabaseUrlSource()
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to install Supabase schema."
      },
      { status: 500 }
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}

function getDatabaseUrl() {
  return normalizeDatabaseUrl(
    process.env.SUPABASE_DB_URL ??
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL
  );
}

function getDatabaseUrlSource() {
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

function normalizeDatabaseUrl(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.replace(/^DATABASE_URL=/, "").replace(/^DIRECT_URL=/, "").replace(/^SUPABASE_DB_URL=/, "").replace(/^"|"$/g, "");
}
