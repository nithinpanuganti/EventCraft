import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword } from "@/lib/auth";

describe("Authentication & Password Security", () => {
  it("securely hashes plaintext passwords and validates matches", async () => {
    const raw = "superSecureP@ssword123";
    const hash = await hashPassword(raw);

    expect(hash).not.toBe(raw);
    expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);

    const matches = await comparePassword(raw, hash);
    expect(matches).toBe(true);

    const wrongMatch = await comparePassword("incorrectGuess", hash);
    expect(wrongMatch).toBe(false);
  });

  it("verifies and decodes valid signed JWT session tokens", async () => {
    const { SignJWT, jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET || "fallback-secret-minimum-32-chars-key-eventcraft"
    );

    const token = await new SignJWT({
      sub: "user-test-123",
      email: "test@eventcraft.ai",
      name: "Test User",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(secret);

    const { payload } = await jwtVerify(token, secret);
    expect(payload.sub).toBe("user-test-123");
    expect(payload.email).toBe("test@eventcraft.ai");
    expect(payload.name).toBe("Test User");
  });

  it("rejects tampered or forged JWT tokens", async () => {
    const { jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET || "fallback-secret-minimum-32-chars-key-eventcraft"
    );
    const forgedSecret = new TextEncoder().encode("wrong-secret-key-32-chars-attacker");
    const { SignJWT } = await import("jose");

    const forgedToken = await new SignJWT({
      sub: "attacker",
      email: "attacker@evil.com",
      name: "Attacker",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(forgedSecret);

    await expect(jwtVerify(forgedToken, secret)).rejects.toThrow();
  });
});
