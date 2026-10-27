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

  it("generates corporate and birthday plans with tailored categories", () => {
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
  });
});
