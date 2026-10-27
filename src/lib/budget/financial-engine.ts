/**
 * Deterministic Financial Math Engine for EventCraft AI.
 * 
 * Strict Rules:
 * 1. Financial calculations use integer minor units (cents) to eliminate binary floating-point drift.
 * 2. 1 standard unit = 100 minor units (cents).
 * 3. Never combines different currencies.
 * 4. Zero-budget handling returns safe 0% metrics without division by zero.
 * 5. Deterministic overrun warnings based on configurable thresholds (default: 80% approaching, 100% reached, >100% exceeded).
 */

export const DEFAULT_WARNING_THRESHOLD_PERCENT = 80;

export interface CategoryFinancialSummary {
  id: string;
  name: string;
  allocatedAmount: number; // In dollars
  allocatedPercentage: number; // 0 to 100
  estimatedAmount: number; // In dollars
  totalActualSpent: number; // In dollars
  remainingBalance: number; // allocatedAmount - totalActualSpent
  variance: number; // allocatedAmount - totalActualSpent (negative if over budget)
  utilizationPercentage: number; // (totalActualSpent / allocatedAmount) * 100, safe against 0
  isOverBudget: boolean;
  isApproachingThreshold: boolean;
  overrunAmount: number; // max(0, totalActualSpent - allocatedAmount)
  expenseCount: number;
}

export interface OverallBudgetSummary {
  totalBudget: number; // Event target limit in dollars
  currency: string;
  totalAllocated: number; // Sum of category allocated amounts
  totalEstimated: number; // Sum of category estimated amounts
  unallocatedBudget: number; // totalBudget - totalAllocated (can be >= 0)
  totalActualSpent: number; // Sum of all actual expenses
  remainingBudget: number; // totalBudget - totalActualSpent (negative if over budget)
  overallVariance: number; // totalBudget - totalActualSpent
  utilizationPercentage: number; // (totalActualSpent / totalBudget) * 100
  allocationUtilizationPercentage: number; // (totalAllocated / totalBudget) * 100
  isOverBudget: boolean;
  isApproachingThreshold: boolean;
  overrunAmount: number; // max(0, totalActualSpent - totalBudget)
  warningThresholdPercent: number;
  categorySummaries: CategoryFinancialSummary[];
}

/**
 * Converts a decimal dollar amount to integer cents (minor units).
 * Uses Math.round to avoid IEEE 754 precision anomalies like 19.99 * 100 = 1998.9999999999998
 */
export function toCents(amount: number | string): number {
  const numeric = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numeric) || !isFinite(numeric)) return 0;
  return Math.round(numeric * 100);
}

/**
 * Converts integer cents (minor units) back to decimal dollars.
 */
export function fromCents(cents: number): number {
  if (isNaN(cents) || !isFinite(cents)) return 0;
  return Number((cents / 100).toFixed(2));
}

/**
 * Formats a monetary dollar amount with currency symbol and 2 decimal places.
 */
export function formatMoney(amount: number, currency = "INR"): string {
  try {
    const locale = currency === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if currency code is custom or invalid
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Safely computes percentage with 1 decimal place.
 * Returns 0 if base is <= 0.
 */
export function calculatePercentage(partCents: number, wholeCents: number): number {
  if (wholeCents <= 0 || partCents <= 0) return 0;
  const pct = (partCents / wholeCents) * 100;
  return Number(pct.toFixed(1));
}

export interface RawCategoryInput {
  id: string;
  name: string;
  allocatedAmount: number | string;
  allocatedPercentage?: number | string;
  estimatedAmount?: number | string;
}

export interface RawExpenseInput {
  id: string;
  budgetCategoryId: string;
  amount: number | string;
  name?: string;
  dateIncurred?: Date | string;
}

/**
 * Calculates complete deterministic financial metrics for an event and its categories.
 */
export function calculateBudgetMetrics(
  totalBudgetDollars: number | string,
  currency: string,
  categories: RawCategoryInput[],
  expenses: RawExpenseInput[],
  warningThreshold = DEFAULT_WARNING_THRESHOLD_PERCENT
): OverallBudgetSummary {
  const totalBudgetCents = Math.max(0, toCents(totalBudgetDollars));

  // Map expenses to categories and compute category spent cents
  const categorySpentMap = new Map<string, { cents: number; count: number }>();
  let totalSpentCents = 0;

  for (const exp of expenses) {
    const expCents = Math.max(0, toCents(exp.amount));
    totalSpentCents += expCents;

    const current = categorySpentMap.get(exp.budgetCategoryId) || { cents: 0, count: 0 };
    current.cents += expCents;
    current.count += 1;
    categorySpentMap.set(exp.budgetCategoryId, current);
  }

  let totalAllocatedCents = 0;
  let totalEstimatedCents = 0;

  const categorySummaries: CategoryFinancialSummary[] = categories.map((cat) => {
    const allocatedCents = Math.max(0, toCents(cat.allocatedAmount));
    const estimatedCents = Math.max(0, toCents(cat.estimatedAmount ?? 0));
    totalAllocatedCents += allocatedCents;
    totalEstimatedCents += estimatedCents;

    const spentData = categorySpentMap.get(cat.id) || { cents: 0, count: 0 };
    const spentCents = spentData.cents;
    const remainingCents = allocatedCents - spentCents;
    const isOver = spentCents > allocatedCents;
    const overrunCents = isOver ? spentCents - allocatedCents : 0;

    const utilizationPct = calculatePercentage(spentCents, allocatedCents);
    const isApproaching =
      !isOver && allocatedCents > 0 && utilizationPct >= warningThreshold;

    const allocatedPct = totalBudgetCents > 0
      ? calculatePercentage(allocatedCents, totalBudgetCents)
      : (cat.allocatedPercentage ? Number(cat.allocatedPercentage) : 0);

    return {
      id: cat.id,
      name: cat.name,
      allocatedAmount: fromCents(allocatedCents),
      allocatedPercentage: allocatedPct,
      estimatedAmount: fromCents(estimatedCents),
      totalActualSpent: fromCents(spentCents),
      remainingBalance: fromCents(remainingCents),
      variance: fromCents(remainingCents),
      utilizationPercentage: utilizationPct,
      isOverBudget: isOver,
      isApproachingThreshold: isApproaching,
      overrunAmount: fromCents(overrunCents),
      expenseCount: spentData.count,
    };
  });

  const unallocatedCents = Math.max(0, totalBudgetCents - totalAllocatedCents);
  const remainingBudgetCents = totalBudgetCents - totalSpentCents;
  const isOverallOver = totalSpentCents > totalBudgetCents;
  const overallOverrunCents = isOverallOver ? totalSpentCents - totalBudgetCents : 0;
  const overallUtilization = calculatePercentage(totalSpentCents, totalBudgetCents);
  const isOverallApproaching =
    !isOverallOver && totalBudgetCents > 0 && overallUtilization >= warningThreshold;

  return {
    totalBudget: fromCents(totalBudgetCents),
    currency,
    totalAllocated: fromCents(totalAllocatedCents),
    totalEstimated: fromCents(totalEstimatedCents),
    unallocatedBudget: fromCents(unallocatedCents),
    totalActualSpent: fromCents(totalSpentCents),
    remainingBudget: fromCents(remainingBudgetCents),
    overallVariance: fromCents(remainingBudgetCents),
    utilizationPercentage: overallUtilization,
    allocationUtilizationPercentage: calculatePercentage(totalAllocatedCents, totalBudgetCents),
    isOverBudget: isOverallOver,
    isApproachingThreshold: isOverallApproaching,
    overrunAmount: fromCents(overallOverrunCents),
    warningThresholdPercent: warningThreshold,
    categorySummaries,
  };
}

/**
 * Validates whether proposed category allocations exceed the total event budget.
 */
export function validateProposedAllocations(
  totalBudgetDollars: number | string,
  proposedCategories: { name: string; allocatedAmount: number | string }[]
): {
  isValid: boolean;
  totalBudgetCents: number;
  proposedTotalCents: number;
  exceededByCents: number;
  errorMessage?: string;
} {
  const totalBudgetCents = Math.max(0, toCents(totalBudgetDollars));
  let proposedTotalCents = 0;

  for (const cat of proposedCategories) {
    const cents = toCents(cat.allocatedAmount);
    if (cents < 0) {
      return {
        isValid: false,
        totalBudgetCents,
        proposedTotalCents,
        exceededByCents: 0,
        errorMessage: `Allocation for "${cat.name}" cannot be negative.`,
      };
    }
    proposedTotalCents += cents;
  }

  if (proposedTotalCents > totalBudgetCents) {
    const exceeded = proposedTotalCents - totalBudgetCents;
    return {
      isValid: false,
      totalBudgetCents,
      proposedTotalCents,
      exceededByCents: exceeded,
      errorMessage: `Proposed allocations (${fromCents(proposedTotalCents)}) exceed event budget (${fromCents(totalBudgetCents)}) by ${fromCents(exceeded)}.`,
    };
  }

  return {
    isValid: true,
    totalBudgetCents,
    proposedTotalCents,
    exceededByCents: 0,
  };
}
