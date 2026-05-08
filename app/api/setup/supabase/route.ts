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

  const databaseUrl = process.env.SUPABASE_DB_URL?.trim();

  if (!databaseUrl) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_DB_URL is missing. Add the Supabase direct database connection string on Render, then redeploy."
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
      message: "Schema Supabase installe ou mis a jour."
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
