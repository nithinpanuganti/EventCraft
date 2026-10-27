import { describe, it, expect } from "vitest";
import { RegisterSchema, CreateEventSchema } from "./index";

describe("Validation Schemas & Input Boundary Tests", () => {
  describe("RegisterSchema", () => {
    it("accepts valid registration data", () => {
      const valid = {
        name: "Maya Chen",
        email: "MAYA@Example.Com",
        password: "strongpassword123",
      };
      const result = RegisterSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("maya@example.com"); // Normalized lowercase
      }
    });

    it("rejects password shorter than 8 characters", () => {
      const invalid = {
        name: "Maya",
        email: "maya@example.com",
        password: "short",
      };
      const result = RegisterSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects invalid email formats", () => {
      const invalid = {
        name: "Maya",
        email: "not-an-email",
        password: "strongpassword123",
      };
      const result = RegisterSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("CreateEventSchema", () => {
    it("accepts valid event parameters", () => {
      const valid = {
        type: "WEDDING",
        title: "Sunset Garden Wedding",
        guestCount: 120,
        totalBudget: 25000,
        currency: "USD",
        themePreferences: "Boho Rustic, Minimalist",
      };
      const result = CreateEventSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects invalid event types", () => {
      const invalid = {
        type: "CONCERT", // Not allowed in core 3 types
        title: "Rock Festival",
        guestCount: 500,
        totalBudget: 10000,
        currency: "USD",
      };
      const result = CreateEventSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects negative budgets or zero guest counts", () => {
      const invalidBudget = {
        type: "BIRTHDAY",
        title: "30th Birthday",
        guestCount: 25,
        totalBudget: -500,
        currency: "USD",
      };
      expect(CreateEventSchema.safeParse(invalidBudget).success).toBe(false);

      const invalidGuests = {
        type: "BIRTHDAY",
        title: "30th Birthday",
        guestCount: 0,
        totalBudget: 1000,
        currency: "USD",
      };
      expect(CreateEventSchema.safeParse(invalidGuests).success).toBe(false);
    });
  });
});
