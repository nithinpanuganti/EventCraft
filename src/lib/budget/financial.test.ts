import { describe, it, expect } from "vitest";
import {
  toCents,
  fromCents,
  calculatePercentage,
  calculateBudgetMetrics,
  validateProposedAllocations,
  formatMoney,
} from "./financial-engine";

describe("Deterministic Financial Engine", () => {
  describe("Precision & Cents Conversion", () => {
    it("safely converts fractional dollars to exact cents without floating point anomalies", () => {
      expect(toCents(19.99)).toBe(1999);
      expect(toCents("19.99")).toBe(1999);
      expect(toCents(0.01)).toBe(1);
      expect(toCents(0)).toBe(0);
      expect(toCents(-10)).toBe(-1000);
      expect(toCents("invalid")).toBe(0);
    });

    it("safely converts cents back to decimal numbers", () => {
      expect(fromCents(1999)).toBe(19.99);
      expect(fromCents(100)).toBe(1.0);
      expect(fromCents(0)).toBe(0);
    });

    it("computes safe percentages with 1 decimal place and prevents division by zero", () => {
      expect(calculatePercentage(50, 200)).toBe(25.0);
      expect(calculatePercentage(100, 300)).toBe(33.3);
      expect(calculatePercentage(10, 0)).toBe(0);
      expect(calculatePercentage(-10, 100)).toBe(0);
    });

    it("formats currency strings consistently", () => {
      expect(formatMoney(1500, "USD")).toContain("1,500.00");
      expect(formatMoney(25.5, "EUR")).toContain("25.50");
    });
  });

  describe("Budget & Overrun Calculations", () => {
    const categories = [
      { id: "cat-1", name: "Venue", allocatedAmount: 5000, estimatedAmount: 4800 },
      { id: "cat-2", name: "Catering", allocatedAmount: 3000, estimatedAmount: 3000 },
      { id: "cat-3", name: "Photo", allocatedAmount: 1500, estimatedAmount: 1500 },
    ];

    it("calculates exact metrics when spending is on track and under budget", () => {
      const expenses = [
        { id: "e1", budgetCategoryId: "cat-1", amount: 2000 },
        { id: "e2", budgetCategoryId: "cat-2", amount: 1000 },
      ];

      const summary = calculateBudgetMetrics(10000, "USD", categories, expenses);

      expect(summary.totalBudget).toBe(10000);
      expect(summary.totalAllocated).toBe(9500);
      expect(summary.unallocatedBudget).toBe(500); // 10000 - 9500
      expect(summary.totalActualSpent).toBe(3000); // 2000 + 1000
      expect(summary.remainingBudget).toBe(7000); // 10000 - 3000
      expect(summary.utilizationPercentage).toBe(30.0);
      expect(summary.isOverBudget).toBe(false);
      expect(summary.isApproachingThreshold).toBe(false);
      expect(summary.overrunAmount).toBe(0);

      // Category level
      const venue = summary.categorySummaries.find((c) => c.id === "cat-1")!;
      expect(venue.totalActualSpent).toBe(2000);
      expect(venue.remainingBalance).toBe(3000);
      expect(venue.utilizationPercentage).toBe(40.0);
      expect(venue.isOverBudget).toBe(false);
    });

    it("flags category overrun when actual expense exceeds category allocation", () => {
      const expenses = [
        { id: "e1", budgetCategoryId: "cat-2", amount: 3500 }, // Allocated 3000
      ];

      const summary = calculateBudgetMetrics(10000, "USD", categories, expenses);

      const catering = summary.categorySummaries.find((c) => c.id === "cat-2")!;
      expect(catering.totalActualSpent).toBe(3500);
      expect(catering.remainingBalance).toBe(-500);
      expect(catering.isOverBudget).toBe(true);
      expect(catering.overrunAmount).toBe(500);
      expect(catering.utilizationPercentage).toBe(116.7);

      // Overall event is still under total budget (3500 <= 10000)
      expect(summary.isOverBudget).toBe(false);
      expect(summary.remainingBudget).toBe(6500);
    });

    it("flags overall event overrun when total expenses exceed total budget", () => {
      const expenses = [
        { id: "e1", budgetCategoryId: "cat-1", amount: 6000 },
        { id: "e2", budgetCategoryId: "cat-2", amount: 4500 },
      ];

      const summary = calculateBudgetMetrics(10000, "USD", categories, expenses);

      expect(summary.totalActualSpent).toBe(10500);
      expect(summary.remainingBudget).toBe(-500);
      expect(summary.isOverBudget).toBe(true);
      expect(summary.overrunAmount).toBe(500);
      expect(summary.utilizationPercentage).toBe(105.0);
    });

    it("detects approaching threshold warning at 80% utilization", () => {
      const expenses = [
        { id: "e1", budgetCategoryId: "cat-1", amount: 4100 }, // 4100 / 5000 = 82%
      ];

      const summary = calculateBudgetMetrics(10000, "USD", categories, expenses, 80);

      const venue = summary.categorySummaries.find((c) => c.id === "cat-1")!;
      expect(venue.utilizationPercentage).toBe(82.0);
      expect(venue.isApproachingThreshold).toBe(true);
      expect(venue.isOverBudget).toBe(false);
    });

    it("handles zero total budget safely without throwing", () => {
      const summary = calculateBudgetMetrics(0, "USD", [], []);
      expect(summary.totalBudget).toBe(0);
      expect(summary.utilizationPercentage).toBe(0);
      expect(summary.isOverBudget).toBe(false);
      expect(summary.unallocatedBudget).toBe(0);
    });
  });

  describe("Proposed Allocations Validation", () => {
    it("accepts proposed allocations within the total event budget", () => {
      const proposed = [
        { name: "Venue", allocatedAmount: 5000 },
        { name: "Catering", allocatedAmount: 3000 },
      ];
      const result = validateProposedAllocations(10000, proposed);
      expect(result.isValid).toBe(true);
      expect(result.exceededByCents).toBe(0);
    });

    it("rejects proposed allocations that exceed the total event budget", () => {
      const proposed = [
        { name: "Venue", allocatedAmount: 7000 },
        { name: "Catering", allocatedAmount: 4000 },
      ];
      const result = validateProposedAllocations(10000, proposed);
      expect(result.isValid).toBe(false);
      expect(result.exceededByCents).toBe(100000); // $1000.00
      expect(result.errorMessage).toContain("exceed event budget");
    });

    it("rejects negative allocations", () => {
      const proposed = [
        { name: "Venue", allocatedAmount: -500 },
      ];
      const result = validateProposedAllocations(10000, proposed);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain("cannot be negative");
    });
  });
});
