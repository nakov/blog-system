import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createToken, hashPassword } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { registerSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.", 400);
    }

    const { email, password } = parsed.data;

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existing) {
      return jsonError("Email already registered.", 409);
    }

    const passwordHash = await hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
      })
      .returning({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
      });

    const token = createToken({
      userId: newUser.id,
      email: newUser.email,
    });

    return NextResponse.json(
      {
        user: newUser,
        token,
      },
      { status: 201 }
    );
  } catch {
    return jsonError("Failed to register user.", 500);
  }
}
