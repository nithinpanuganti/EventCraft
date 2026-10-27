import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LoginSchema } from "@/lib/validations";
import { comparePassword, createSessionCookie } from "@/lib/auth";
import { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const result = LoginSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { email, password } = result.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Use generic error to prevent email enumeration
      return NextResponse.json(
        { error: "Invalid email address or password." },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Invalid email address or password." },
        { status: 401 }
      );
    }

    await createSessionCookie({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    // Check for database connection / unreachable server errors
    const isDbUnreachable =
      error instanceof Prisma.PrismaClientInitializationError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P1000", "P1001", "P1002", "P1003", "P1017"].includes(error.code)) ||
      (error instanceof Error &&
        (error.message.includes("Can't reach database server") ||
          error.message.includes("ECONNREFUSED")));

    if (isDbUnreachable) {
      console.error(
        "[AUTH_LOGIN_DB_OFFLINE] Database unreachable at configured host/port."
      );
      return NextResponse.json(
        {
          error:
            "Database service is temporarily unavailable. Please verify PostgreSQL is running.",
        },
        { status: 503 }
      );
    }

    console.error(
      "[AUTH_LOGIN_ERROR]",
      error instanceof Error ? error.message : "Unexpected login error"
    );

    return NextResponse.json(
      { error: "Internal server error occurred during login." },
      { status: 500 }
    );
  }
}
