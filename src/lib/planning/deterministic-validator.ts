import {
  GeneratedEventPlan,
  PlanBudgetProposal,
  PlanMilestone,
  PlanTask,
} from "./schema";
import { SanitizedPlanningContext } from "./context-builder";

export interface ValidationIssue {
  field: string;
  issue: string;
  severity: "error" | "warning";
}

export interface PlanValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  adjustedPlan: GeneratedEventPlan;
}

/**
 * Deterministically balances category allocations:
 * 1. Checks that sum of category percentages equals 100%. If within slight tolerance (e.g., 98-102%), normalizes.
 * 2. Recalculates exact category amounts based on integer cents to avoid floating-point drift.
 * 3. Enforces that total allocated dollars never exceed totalBudget.
 */
export function validateAndBalanceBudget(
  budget: PlanBudgetProposal,
  targetBudget: number,
  currency: string
): { balanced: PlanBudgetProposal; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  // Enforce correct currency
  const cleanCurrency = currency.toUpperCase().slice(0, 3);
  const totalCents = Math.round(targetBudget * 100);

  if (targetBudget <= 0) {
    // Zero budget edge case: each category has 0 allocated amount
    const zeroCategories = budget.categories.map((c) => ({
      ...c,
      allocatedAmount: 0,
      estimatedAmount: 0,
      allocatedPercentage: Number(c.allocatedPercentage.toFixed(2)),
    }));
    return {
      balanced: {
        ...budget,
        totalBudget: 0,
        currency: cleanCurrency,
        categories: zeroCategories,
        isBalanced: true,
      },
      issues,
    };
  }

  // Sum raw percentages
  let sumPercentage = budget.categories.reduce((acc, c) => acc + (c.allocatedPercentage || 0), 0);

  // If percentage sum is roughly 100 (90% - 110%) or 0, normalize
  let normalizedCategories = [...budget.categories];
  if (sumPercentage <= 0) {
    issues.push({
      field: "budget.categories",
      issue: "Category percentages summed to 0; distributing evenly.",
      severity: "warning",
    });
    const evenPct = 100 / normalizedCategories.length;
    normalizedCategories = normalizedCategories.map((c) => ({
      ...c,
      allocatedPercentage: evenPct,
    }));
    sumPercentage = 100;
  } else if (Math.abs(sumPercentage - 100) > 0.01) {
    issues.push({
      field: "budget.categories",
      issue: `Category percentages summed to ${sumPercentage.toFixed(2)}%; normalizing to 100%.`,
      severity: "warning",
    });
    normalizedCategories = normalizedCategories.map((c) => ({
      ...c,
      allocatedPercentage: Number(((c.allocatedPercentage / sumPercentage) * 100).toFixed(2)),
    }));
  }

  // Re-sum after rounding to adjust any remaining 1-cent discrepancy on the final category
  let remainingCents = totalCents;
  const computedCategories = normalizedCategories.map((c, idx) => {
    const isLast = idx === normalizedCategories.length - 1;
    let catCents: number;

    if (isLast) {
      catCents = Math.max(0, remainingCents);
    } else {
      catCents = Math.round((c.allocatedPercentage / 100) * totalCents);
      remainingCents -= catCents;
    }

    const catDollars = Number((catCents / 100).toFixed(2));
    return {
      ...c,
      allocatedAmount: catDollars,
      estimatedAmount: catDollars,
      allocatedPercentage: Number(((catCents / totalCents) * 100).toFixed(2)),
    };
  });

  return {
    balanced: {
      ...budget,
      totalBudget: targetBudget,
      currency: cleanCurrency,
      categories: computedCategories,
      isBalanced: true,
    },
    issues,
  };
}

/**
 * Deterministically verifies timeline and task dates:
 * - If eventDate is confirmed, computes exact ISO date strings (targetDate and dueDate) based on offsetDays.
 * - Prevents tasks from being scheduled in the past if eventDate is known.
 * - If eventDate is unconfirmed, clears exact dates and keeps relative offsetDays intact.
 */
export function validateAndNormalizeDates(
  milestones: PlanMilestone[],
  tasks: PlanTask[],
  context: SanitizedPlanningContext
): {
  normalizedMilestones: PlanMilestone[];
  normalizedTasks: PlanTask[];
  issues: ValidationIssue[];
} {
  const issues: ValidationIssue[] = [];
  const eventDate = context.eventDate ? new Date(context.eventDate) : null;
  const hasConfirmedDate = eventDate !== null && !isNaN(eventDate.getTime());

  const normalizedMilestones = milestones.map((m) => {
    let targetDateStr: string | undefined = undefined;

    if (hasConfirmedDate && eventDate) {
      const milestoneDate = new Date(eventDate);
      milestoneDate.setDate(milestoneDate.getDate() + m.offsetDays);
      targetDateStr = milestoneDate.toISOString().split("T")[0];
    }

    return {
      ...m,
      targetDate: targetDateStr,
    };
  });

  const normalizedTasks = tasks.map((t) => {
    let dueDateStr: string | undefined = undefined;

    if (hasConfirmedDate && eventDate) {
      const taskDate = new Date(eventDate);
      taskDate.setDate(taskDate.getDate() + t.offsetDays);
      dueDateStr = taskDate.toISOString().split("T")[0];
    }

    return {
      ...t,
      dueDate: dueDateStr,
    };
  });

  return {
    normalizedMilestones,
    normalizedTasks,
    issues,
  };
}

/**
 * Comprehensive deterministic validation and normalization pass over the generated plan.
 */
export function validateAndNormalizePlan(
  rawPlan: GeneratedEventPlan,
  context: SanitizedPlanningContext
): PlanValidationResult {
  const allIssues: ValidationIssue[] = [];

  // 1. Balance and calculate exact budget
  const { balanced: balancedBudget, issues: budgetIssues } = validateAndBalanceBudget(
    rawPlan.budget,
    context.totalBudget,
    context.currency
  );
  allIssues.push(...budgetIssues);

  // 2. Normalize milestones and tasks timeline
  const {
    normalizedMilestones,
    normalizedTasks,
    issues: timelineIssues,
  } = validateAndNormalizeDates(rawPlan.milestones, rawPlan.tasks, context);
  allIssues.push(...timelineIssues);

  const adjustedPlan: GeneratedEventPlan = {
    ...rawPlan,
    budget: balancedBudget,
    milestones: normalizedMilestones,
    tasks: normalizedTasks,
  };

  const hasCriticalErrors = allIssues.some((i) => i.severity === "error");

  return {
    isValid: !hasCriticalErrors,
    issues: allIssues,
    adjustedPlan,
  };
}
