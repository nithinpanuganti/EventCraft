import { describe, it, expect } from "vitest";
import { GeneratedEventPlanSchema } from "@/lib/planning/schema";
import { buildPlanningContext } from "@/lib/planning/context-builder";
import {
  validateAndBalanceBudget,
  validateAndNormalizeDates,
} from "@/lib/planning/deterministic-validator";
import { FallbackPlanService } from "@/lib/planning/fallback-service";

describe("Phase 5: Planning Engine Unit Tests", () => {
  const baseContext = buildPlanningContext({
    eventId: "ev_test_123",
    userId: "usr_test_abc",
    type: "WEDDING",
    title: "Maya & Liam Wedding",
    description: "Garden celebration with dinner banquet.",
    eventDate: "2027-06-15",
    location: "Austin, TX",
    guestCount: 100,
    totalBudget: 20000,
    currency: "USD",
    themePreferences: "Bohemian Floral",
    culturalPreferences: "Traditional blessing",
    dietaryRestrictions: "Vegetarian options",
    accessibilityRequirements: "Step-free ramp",
    specialInstructions: "Photographer arrives at 2 PM",
  });

  describe("A. Context Builder & Sanitization", () => {
    it("sanitizes control characters and bounds input lengths", () => {
      const dirtyContext = buildPlanningContext({
        eventId: "ev_1",
        userId: "u_1",
        type: "BIRTHDAY",
        title: "Liam's Party \u0000\u0008 Special",
        guestCount: -5, // invalid negative headcount
        totalBudget: -1000, // invalid negative budget
        currency: "usdxx",
      });

      expect(dirtyContext.title).toBe("Liam's Party  Special");
      expect(dirtyContext.guestCount).toBe(1); // normalized min
      expect(dirtyContext.totalBudget).toBe(0); // normalized non-negative
      expect(dirtyContext.currency).toBe("USD");
      expect(dirtyContext.isDateConfirmed).toBe(false);
    });
  });

  describe("B. Deterministic Budget Validator", () => {
    it("balances categories summing to roughly 100% and calculates exact dollar cents", () => {
      const rawBudget = {
        totalBudget: 20000,
        currency: "USD",
        categories: [
          {
            categoryName: "Venue",
            allocatedPercentage: 40,
            allocatedAmount: 0,
            estimatedAmount: 0,
            rationale: "Space rental",
          },
          {
            categoryName: "Catering",
            allocatedPercentage: 35,
            allocatedAmount: 0,
            estimatedAmount: 0,
            rationale: "Banquet",
          },
          {
            categoryName: "Photography",
            allocatedPercentage: 25,
            allocatedAmount: 0,
            estimatedAmount: 0,
            rationale: "Coverage",
          },
        ],
        contingencyPercentage: 5,
        isBalanced: false,
      };

      const { balanced } = validateAndBalanceBudget(rawBudget, 20000, "USD");
      expect(balanced.isBalanced).toBe(true);

      const totalAllocated = balanced.categories.reduce((acc, c) => acc + c.allocatedAmount, 0);
      expect(totalAllocated).toBe(20000);
      expect(balanced.categories[0].allocatedAmount).toBe(8000);
      expect(balanced.categories[1].allocatedAmount).toBe(7000);
      expect(balanced.categories[2].allocatedAmount).toBe(5000);
    });

    it("normalizes percentages summing over or under 100% deterministically", () => {
      const rawBudget = {
        totalBudget: 10000,
        currency: "EUR",
        categories: [
          {
            categoryName: "Cat A",
            allocatedPercentage: 60,
            allocatedAmount: 0,
            estimatedAmount: 0,
            rationale: "A",
          },
          {
            categoryName: "Cat B",
            allocatedPercentage: 60, // Total 120%
            allocatedAmount: 0,
            estimatedAmount: 0,
            rationale: "B",
          },
        ],
        contingencyPercentage: 5,
        isBalanced: false,
      };

      const { balanced, issues } = validateAndBalanceBudget(rawBudget, 10000, "EUR");
      expect(balanced.currency).toBe("EUR");
      expect(issues.length).toBeGreaterThan(0);
      expect(balanced.categories[0].allocatedPercentage).toBe(50);
      expect(balanced.categories[1].allocatedPercentage).toBe(50);

      const sumDollars = balanced.categories.reduce((acc, c) => acc + c.allocatedAmount, 0);
      expect(sumDollars).toBe(10000);
    });

    it("handles zero budget edge case gracefully", () => {
      const rawBudget = {
        totalBudget: 0,
        currency: "USD",
        categories: [
          {
            categoryName: "Venue",
            allocatedPercentage: 50,
            allocatedAmount: 0,
            estimatedAmount: 0,
            rationale: "None",
          },
          {
            categoryName: "Decor",
            allocatedPercentage: 50,
            allocatedAmount: 0,
            estimatedAmount: 0,
            rationale: "None",
          },
        ],
        contingencyPercentage: 0,
        isBalanced: false,
      };

      const { balanced } = validateAndBalanceBudget(rawBudget, 0, "USD");
      expect(balanced.totalBudget).toBe(0);
      expect(balanced.categories[0].allocatedAmount).toBe(0);
      expect(balanced.categories[1].allocatedAmount).toBe(0);
    });
  });

  describe("C. Timeline & Date Validator", () => {
    it("computes exact target calendar dates when eventDate is confirmed", () => {
      const milestones = [
        {
          title: "Book Venue",
          phase: "BOOKING" as const,
          offsetDays: -30,
          description: "Reserve hall",
          priority: "CRITICAL" as const,
        },
      ];
      const tasks = [
        {
          title: "Send Invites",
          phase: "PREPARATION" as const,
          priority: "HIGH" as const,
          offsetDays: -14,
        },
      ];

      const { normalizedMilestones, normalizedTasks } = validateAndNormalizeDates(
        milestones,
        tasks,
        baseContext
      );

      expect(normalizedMilestones[0].targetDate).toBe("2027-05-16");
      expect(normalizedTasks[0].dueDate).toBe("2027-06-01");
    });

    it("leaves targetDate undefined for provisional / unconfirmed date drafts", () => {
      const unconfirmedContext = {
        ...baseContext,
        eventDate: undefined,
        isDateConfirmed: false,
      };

      const milestones = [
        {
          title: "Initial Concept",
          phase: "PLANNING" as const,
          offsetDays: -90,
          description: "Ideate themes",
          priority: "MEDIUM" as const,
        },
      ];
      const tasks = [
        {
          title: "Collect Pinterest boards",
          phase: "PLANNING" as const,
          priority: "LOW" as const,
          offsetDays: -60,
        },
      ];

      const { normalizedMilestones, normalizedTasks } = validateAndNormalizeDates(
        milestones,
        tasks,
        unconfirmedContext
      );

      expect(normalizedMilestones[0].targetDate).toBeUndefined();
      expect(normalizedTasks[0].dueDate).toBeUndefined();
      expect(normalizedMilestones[0].offsetDays).toBe(-90);
    });
  });

  describe("D. Curated Domain Fallback Templates", () => {
    it("generates a valid, complete wedding fallback plan conforming to GeneratedEventPlanSchema", () => {
      const plan = FallbackPlanService.generateFallbackPlan(baseContext);

      const parsed = GeneratedEventPlanSchema.safeParse(plan);
      expect(parsed.success).toBe(true);
      expect(plan.metadata.source).toBe("curated-fallback");
      expect(plan.summary.conceptTitle).toContain("Maya & Liam");
      expect(plan.budget.totalBudget).toBe(20000);
      expect(plan.budget.categories.length).toBeGreaterThanOrEqual(4);
      expect(plan.milestones.length).toBeGreaterThanOrEqual(3);
      expect(plan.tasks.length).toBeGreaterThanOrEqual(4);
      expect(plan.dayOfSchedule.length).toBeGreaterThanOrEqual(4);
      expect(plan.vendors.length).toBeGreaterThanOrEqual(2);
    });

    it("generates a valid birthday fallback plan", () => {
      const bdayContext = buildPlanningContext({
        eventId: "ev_bday",
        userId: "u_1",
        type: "BIRTHDAY",
        title: "Marcus 30th Birthday",
        guestCount: 40,
        totalBudget: 4000,
        currency: "USD",
      });

      const plan = FallbackPlanService.generateFallbackPlan(bdayContext);
      const parsed = GeneratedEventPlanSchema.safeParse(plan);

      expect(parsed.success).toBe(true);
      expect(plan.summary.conceptTitle).toContain("Marcus 30th Birthday");
      expect(plan.budget.totalBudget).toBe(4000);
      expect(plan.theme.decorationIdeas.length).toBeGreaterThan(0);
    });

    it("generates a valid community event fallback plan with accessibility and permits", () => {
      const commContext = buildPlanningContext({
        eventId: "ev_comm",
        userId: "u_1",
        type: "COMMUNITY",
        title: "Eastside Spring Festival",
        guestCount: 500,
        totalBudget: 8000,
        currency: "USD",
        accessibilityRequirements: "Wheelchair ramps at both stages",
      });

      const plan = FallbackPlanService.generateFallbackPlan(commContext);
      const parsed = GeneratedEventPlanSchema.safeParse(plan);

      expect(parsed.success).toBe(true);
      expect(plan.summary.conceptNarrative).toMatch(/community/i);
      expect(plan.tasks.some((t) => t.category === "Permits" || t.category === "Accessibility")).toBe(true);
    });
  });

  describe("E. Schema Rejections on Malformed Model Outputs", () => {
    it("rejects plan missing critical sections", () => {
      const brokenPlan = {
        summary: {
          conceptTitle: "Valid Title",
        },
      };

      const parsed = GeneratedEventPlanSchema.safeParse(brokenPlan);
      expect(parsed.success).toBe(false);
    });

    it("rejects negative category budget proposals", () => {
      const validPlan = FallbackPlanService.generateFallbackPlan(baseContext);
      const invalidPlan = {
        ...validPlan,
        budget: {
          ...validPlan.budget,
          categories: [
            {
              categoryName: "Illegal Category",
              allocatedPercentage: -10,
              allocatedAmount: -500,
              estimatedAmount: -500,
              rationale: "Negative amount",
            },
          ],
        },
      };

      const parsed = GeneratedEventPlanSchema.safeParse(invalidPlan);
      expect(parsed.success).toBe(false);
    });
  });
});
