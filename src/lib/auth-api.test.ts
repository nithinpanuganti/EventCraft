/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: vi.fn(),
    get: vi.fn(),
  })),
}));

// Mock Prisma client
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { hashPassword } from "@/lib/auth";

describe("Registration and Authentication API Handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    it("creates a user record with hashed password and returns 201 on valid input", async () => {
      const mockCreatedUser = {
        id: "usr_12345",
        name: "Maya Chen",
        email: "maya@example.com",
        createdAt: new Date(),
      };

      // Mock user not found (email unique)
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue(mockCreatedUser);

      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Maya Chen",
          email: "Maya@Example.com",
          password: "SecurePassword123!",
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.message).toBe("Registration successful");
      expect(data.user.id).toBe("usr_12345");
      expect(data.user.email).toBe("maya@example.com");

      // Verify Prisma was called with lowercase email and hashed password (never plaintext)
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      const createArgs = (prisma.user.create as any).mock.calls[0][0];
      expect(createArgs.data.email).toBe("maya@example.com");
      expect(createArgs.data.passwordHash).not.toBe("SecurePassword123!");
      expect(
        createArgs.data.passwordHash.startsWith("$2a$") ||
          createArgs.data.passwordHash.startsWith("$2b$")
      ).toBe(true);
    });

    it("rejects duplicate email with 409 conflict", async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "existing_user_id",
        email: "existing@example.com",
      });

      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Another User",
          email: "existing@example.com",
          password: "SecurePassword123!",
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error).toContain("already exists");
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("rejects invalid email address with 400 Bad Request", async () => {
      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "John Doe",
          email: "not-an-email",
          password: "SecurePassword123!",
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.details.email).toBeDefined();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("rejects missing required fields with 400 Bad Request", async () => {
      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          // missing name and password
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.details.name).toBeDefined();
      expect(data.details.password).toBeDefined();
    });

    it("rejects passwords under 8 characters with 400 Bad Request", async () => {
      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "John Doe",
          email: "john@example.com",
          password: "short",
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.details.password[0]).toContain("at least 8 characters");
    });

    it("returns 400 when request body contains malformed JSON", async () => {
      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ malformed json",
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe("Invalid JSON request body.");
    });

    it("handles database unreachable error gracefully with 503 and safe message", async () => {
      // Simulate Prisma P1001 database server unreachable
      const p1001Error = new Prisma.PrismaClientKnownRequestError(
        "Can't reach database server at localhost:5432",
        {
          code: "P1001",
          clientVersion: "6.4.1",
        }
      );

      (prisma.user.findUnique as any).mockRejectedValue(p1001Error);

      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Maya Chen",
          email: "maya@example.com",
          password: "SecurePassword123!",
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data.error).toContain("temporarily unavailable");
      // Must not leak connection string or stack trace
      expect(data.error).not.toContain("localhost:5432");
      expect(data.error).not.toContain("PrismaClient");
    });
  });

  describe("POST /api/auth/login", () => {
    it("logs in registered user with correct password and returns 200", async () => {
      const password = "ValidPassword123!";
      const hash = await hashPassword(password);

      (prisma.user.findUnique as any).mockResolvedValue({
        id: "usr_verified",
        name: "Test User",
        email: "test@example.com",
        passwordHash: hash,
      });

      const req = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password,
        }),
      });

      const res = await loginHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.message).toBe("Login successful");
      expect(data.user.id).toBe("usr_verified");
    });

    it("rejects login with incorrect password with generic 401", async () => {
      const hash = await hashPassword("CorrectPassword123!");

      (prisma.user.findUnique as any).mockResolvedValue({
        id: "usr_verified",
        name: "Test User",
        email: "test@example.com",
        passwordHash: hash,
      });

      const req = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "WrongPassword!",
        }),
      });

      const res = await loginHandler(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain("Invalid email address or password");
    });

    it("rejects non-existent email with generic 401 (preventing user enumeration)", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "unknown@example.com",
          password: "SomePassword123!",
        }),
      });

      const res = await loginHandler(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toContain("Invalid email address or password");
    });

    it("handles database unavailability during login with 503 and safe message", async () => {
      const p1001Error = new Prisma.PrismaClientKnownRequestError(
        "Can't reach database server at localhost:5432",
        {
          code: "P1001",
          clientVersion: "6.4.1",
        }
      );

      (prisma.user.findUnique as any).mockRejectedValue(p1001Error);

      const req = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "SomePassword123!",
        }),
      });

      const res = await loginHandler(req);
      const data = await res.json();

      expect(res.status).toBe(503);
      expect(data.error).toContain("temporarily unavailable");
    });
  });
});
