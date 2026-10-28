import { describe, it, expect } from "vitest";
import { generateLocalPlan } from "./rule-engine";

describe("Deterministic Local Planning Rule Engine", () => {
  it("generates deterministic wedding plan with 100% budget conservation", () => {
    const input = {
      title: "Priya & Rohan Wedding",
      type: "WEDDING" as const,
      eventDate: "2026-11-15",
      guestCount: 250,
      totalBudget: 40000,
      currency: "USD",
      themePreferences: "Royal Crimson & Gold",
      dietaryRestrictions: "Vegetarian, Halal",
    };

    const plan = generateLocalPlan(input);

    expect(plan.summary.conceptTitle).toContain("Wedding");
    expect(plan.budget.categories.length).toBeGreaterThan(0);

    // Verify 100% exact integer-cents conservation
    const totalAllocatedAmount = plan.budget.categories.reduce((sum, c) => sum + c.allocatedAmount, 0);
    expect(totalAllocatedAmount).toBeCloseTo(input.totalBudget, 2);

    // Verify tasks and run-of-show schedule
    expect(plan.tasks.length).toBeGreaterThanOrEqual(5);
    expect(plan.dayOfSchedule.length).toBeGreaterThanOrEqual(4);

    // Verify determinism: repeating with identical inputs produces identical results
    const plan2 = generateLocalPlan(input);
    expect(plan.summary.conceptTitle).toBe(plan2.summary.conceptTitle);
    expect(plan.budget.categories).toEqual(plan2.budget.categories);
  });

  it("generates birthday plans with tailored categories and balanced budget", () => {
    const birthdayPlan = generateLocalPlan({
      title: "Emma's 30th Birthday",
      type: "BIRTHDAY",
      guestCount: 40,
      totalBudget: 3500,
      currency: "USD",
    });

    const categoryNames = birthdayPlan.budget.categories.map((c) => c.categoryName);
    expect(categoryNames).toContain("Food, Bites & Craft Bar");
    expect(categoryNames).toContain("Custom Cake & Dessert Bar");

    const totalAllocated = birthdayPlan.budget.categories.reduce((sum, c) => sum + c.allocatedAmount, 0);
    expect(totalAllocated).toBeCloseTo(3500, 2);
    expect(birthdayPlan.dayOfSchedule.length).toBeGreaterThanOrEqual(4);
  });

  it("generates community event plans with logistics, permits, and volunteers", () => {
    const communityPlan = generateLocalPlan({
      title: "Greenfield Annual Charity Fair",
      type: "COMMUNITY",
      guestCount: 500,
      totalBudget: 12000,
      currency: "USD",
    });

    expect(communityPlan.summary.conceptTitle).toContain("Community");
    const categoryNames = communityPlan.budget.categories.map((c) => c.categoryName);
    expect(categoryNames).toContain("Public Space, Permits & Security");
    expect(categoryNames).toContain("AV Equipment, Stage & PA System");

    const totalAllocated = communityPlan.budget.categories.reduce((sum, c) => sum + c.allocatedAmount, 0);
    expect(totalAllocated).toBeCloseTo(12000, 2);

    const taskPhases = new Set(communityPlan.tasks.map((t) => t.phase));
    expect(taskPhases.has("PLANNING")).toBe(true);
    expect(taskPhases.has("EVENT_DAY")).toBe(true);
  });

  it("guarantees exact cent conservation on awkward budget amounts without float drift", () => {
    const oddBudget = 3333.33;
    const plan = generateLocalPlan({
      title: "Precision Test",
      type: "WEDDING",
      guestCount: 50,
      totalBudget: oddBudget,
      currency: "USD",
    });

    const totalAllocated = plan.budget.categories.reduce((sum, c) => sum + c.allocatedAmount, 0);
    expect(Math.round(totalAllocated * 100)).toBe(Math.round(oddBudget * 100));
  });

  it("handles zero budget without division by zero or NaN values", () => {
    const zeroPlan = generateLocalPlan({
      title: "Zero Budget Meetup",
      type: "COMMUNITY",
      guestCount: 20,
      totalBudget: 0,
      currency: "USD",
    });

    expect(zeroPlan.budget.categories.length).toBeGreaterThan(0);
    for (const cat of zeroPlan.budget.categories) {
      expect(cat.allocatedAmount).toBe(0);
      expect(Number.isNaN(cat.allocatedAmount)).toBe(false);
    }
  });
});
