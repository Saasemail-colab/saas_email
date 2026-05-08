import { NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE_NAME, createAdminSessionToken, verifyAdminCode } from "@/lib/admin/access";

const accessSchema = z.object({
  code: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const parsed = accessSchema.safeParse(await request.json());

    if (!parsed.success || !verifyAdminCode(parsed.data.code)) {
      return NextResponse.json({ error: "Code admin invalide." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionToken(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur pendant l'acces admin." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}
