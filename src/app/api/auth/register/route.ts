import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RegisterSchema } from "@/lib/validations";
import { hashPassword, createSessionCookie } from "@/lib/auth";
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

  const result = RegisterSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { name, email, password } = result.data;

  try {
    // Check email uniqueness
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    // Automatically establish session upon registration
    await createSessionCookie({
      id: user.id,
      email: user.email,
      name: user.name,
    });

    return NextResponse.json(
      { message: "Registration successful", user },
      { status: 201 }
    );
  } catch (error) {
    // Check for Prisma unique constraint race condition
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 }
      );
    }

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
        "[AUTH_REGISTER_DB_OFFLINE] Database unreachable at configured host/port."
      );
      return NextResponse.json(
        {
          error:
            "Database service is temporarily unavailable. Please verify PostgreSQL is running.",
        },
        { status: 503 }
      );
    }

    // Unexpected server errors: log safely without leaking sensitive payload
    console.error(
      "[AUTH_REGISTER_ERROR]",
      error instanceof Error ? error.message : "Unexpected registration error"
    );

    return NextResponse.json(
      { error: "Internal server error occurred during registration." },
      { status: 500 }
    );
  }
}
