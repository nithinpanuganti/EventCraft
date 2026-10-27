import { describe, it, expect } from "vitest";
import {
  Step1Schema,
  Step2Schema,
  Step3Schema,
  Step4Schema,
  CreateEventSchema,
  UpdateEventSchema,
} from "./index";

describe("Event Wizard Multi-Step Validation Tests", () => {
  describe("Step 1: Event Type and Basics", () => {
    it("accepts valid step 1 inputs for Wedding, Birthday, Community", () => {
      const wedding = { type: "WEDDING", title: "Sunset Wedding" };
      const birthday = { type: "BIRTHDAY", title: "Liam's 10th Birthday" };
      const community = { type: "COMMUNITY", title: "Neighborhood Fall Fair" };

      expect(Step1Schema.safeParse(wedding).success).toBe(true);
      expect(Step1Schema.safeParse(birthday).success).toBe(true);
      expect(Step1Schema.safeParse(community).success).toBe(true);
    });

    it("rejects title shorter than 3 characters or missing type", () => {
      expect(Step1Schema.safeParse({ type: "WEDDING", title: "Hi" }).success).toBe(false);
      expect(Step1Schema.safeParse({ title: "Valid Title" } as Record<string, unknown>).success).toBe(false);
    });

    it("accepts optional short description up to 1000 characters", () => {
      const valid = {
        type: "BIRTHDAY",
        title: "Milestone 40th Birthday Celebration",
        description: "An intimate gathering with live jazz and catered banquet.",
      };
      expect(Step1Schema.safeParse(valid).success).toBe(true);
    });
  });

  describe("Step 2: Date and Location", () => {
    it("accepts future date and optional location", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const isoStr = futureDate.toISOString().split("T")[0];

      const res = Step2Schema.safeParse({
        eventDate: isoStr,
        location: "Austin Botanical Gardens",
      });
      expect(res.success).toBe(true);
    });

    it("accepts unconfirmed date for early drafts", () => {
      const res = Step2Schema.safeParse({ location: "TBD Outdoors" });
      expect(res.success).toBe(true);
    });

    it("rejects past dates", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const isoStr = pastDate.toISOString().split("T")[0];

      const res = Step2Schema.safeParse({ eventDate: isoStr });
      expect(res.success).toBe(false);
    });

    it("rejects invalid date strings", () => {
      const res = Step2Schema.safeParse({ eventDate: "not-a-date" });
      expect(res.success).toBe(false);
    });
  });

  describe("Step 3: Headcount and Budget", () => {
    it("validates positive guest counts and non-negative budgets", () => {
      const valid = { guestCount: 150, totalBudget: 35000, currency: "USD" };
      expect(Step3Schema.safeParse(valid).success).toBe(true);
    });

    it("rejects negative budgets or zero guest counts", () => {
      expect(Step3Schema.safeParse({ guestCount: 0, totalBudget: 1000 }).success).toBe(false);
      expect(Step3Schema.safeParse({ guestCount: 50, totalBudget: -100 }).success).toBe(false);
      expect(Step3Schema.safeParse({ guestCount: -5, totalBudget: 5000 }).success).toBe(false);
    });

    it("enforces maximum guest count and budget boundary ceilings", () => {
      expect(Step3Schema.safeParse({ guestCount: 50001, totalBudget: 1000 }).success).toBe(false);
      expect(Step3Schema.safeParse({ guestCount: 100, totalBudget: 100000001 }).success).toBe(false);
    });

    it("validates currency codes conforming to 3-letter ISO", () => {
      expect(Step3Schema.safeParse({ guestCount: 10, totalBudget: 500, currency: "EUR" }).success).toBe(true);
      expect(Step3Schema.safeParse({ guestCount: 10, totalBudget: 500, currency: "US" }).success).toBe(false);
      expect(Step3Schema.safeParse({ guestCount: 10, totalBudget: 500, currency: "USDD" }).success).toBe(false);
    });
  });

  describe("Step 4: Preferences and Special Needs", () => {
    it("accepts optional themes, cultural preferences, dietary constraints, and accessibility requirements", () => {
      const valid = {
        themePreferences: "Rustic chic",
        culturalPreferences: "Traditional tea ceremony",
        dietaryRestrictions: "Vegetarian, Nut allergy",
        accessibilityRequirements: "Wheelchair ramp needed",
        specialInstructions: "Grand entrance song: Song A",
      };
      expect(Step4Schema.safeParse(valid).success).toBe(true);
    });

    it("accepts empty optional preferences for minimal draft setup", () => {
      expect(Step4Schema.safeParse({}).success).toBe(true);
    });
  });

  describe("Full Event Schema Aggregation & Updates", () => {
    it("validates complete combined event payload", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 60);

      const fullEvent = {
        type: "WEDDING",
        title: "Maya & Liam Sunset Wedding",
        description: "Sunset ceremony followed by banquet.",
        eventDate: futureDate.toISOString().split("T")[0],
        location: "Austin, TX",
        guestCount: 120,
        totalBudget: 25000,
        currency: "USD",
        themePreferences: "Bohemian Warm Tones",
        culturalPreferences: "Tea Ceremony",
        dietaryRestrictions: "5 Vegan",
        accessibilityRequirements: "Ramp required",
        specialInstructions: "Photographer arriving at 3pm",
      };

      const result = CreateEventSchema.safeParse(fullEvent);
      expect(result.success).toBe(true);
    });

    it("supports partial update payload through UpdateEventSchema", () => {
      const partialUpdate = {
        title: "Updated Title for Draft",
        totalBudget: 42000,
        status: "DRAFT" as const,
      };

      const res = UpdateEventSchema.safeParse(partialUpdate);
      expect(res.success).toBe(true);
    });
  });
});
