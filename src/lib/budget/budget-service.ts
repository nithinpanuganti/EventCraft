import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  calculateBudgetMetrics,
  toCents,
  fromCents,
  DEFAULT_WARNING_THRESHOLD_PERCENT,
  type OverallBudgetSummary,
} from "./financial-engine";

/**
 * Retrieves the complete budget overview and calculated metrics for an event.
 * Scoped strictly by userId to guarantee multi-tenant data isolation.
 */
export async function getEventBudgetOverview(
  eventId: string,
  userId: string,
  warningThreshold = DEFAULT_WARNING_THRESHOLD_PERCENT
): Promise<{
  event: {
    id: string;
    title: string;
    currency: string;
    totalBudget: number;
    status: string;
  };
  summary: OverallBudgetSummary;
  expenses: {
    id: string;
    budgetCategoryId: string;
    categoryName: string;
    name: string;
    amount: number;
    dateIncurred: Date;
    paymentStatus: string;
    notes: string | null;
  }[];
} | null> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId },
    include: {
      budgetCategories: {
        include: {
          expenses: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!event) {
    return null;
  }

  const rawCategories = event.budgetCategories.map((c) => ({
    id: c.id,
    name: c.name,
    allocatedAmount: Number(c.allocatedAmount),
    allocatedPercentage: Number(c.allocatedPercentage),
    estimatedAmount: Number(c.estimatedAmount),
  }));

  const flatExpenses = event.budgetCategories.flatMap((c) =>
    c.expenses.map((e) => ({
      id: e.id,
      budgetCategoryId: e.budgetCategoryId,
      categoryName: c.name,
      name: e.name,
      amount: Number(e.amount),
      dateIncurred: e.dateIncurred,
      paymentStatus: e.paymentStatus,
      notes: e.notes,
    }))
  ).sort((a, b) => new Date(b.dateIncurred).getTime() - new Date(a.dateIncurred).getTime());

  const rawExpenseInputs = flatExpenses.map((e) => ({
    id: e.id,
    budgetCategoryId: e.budgetCategoryId,
    amount: e.amount,
  }));

  const summary = calculateBudgetMetrics(
    Number(event.totalBudget),
    event.currency,
    rawCategories,
    rawExpenseInputs,
    warningThreshold
  );

  return {
    event: {
      id: event.id,
      title: event.title,
      currency: event.currency,
      totalBudget: Number(event.totalBudget),
      status: event.status,
    },
    summary,
    expenses: flatExpenses,
  };
}

/**
 * Creates a new budget category for an event.
 * Validates that the new allocation does not exceed remaining unallocated budget.
 */
export async function createBudgetCategory(
  eventId: string,
  userId: string,
  data: {
    name: string;
    allocatedAmount: number;
    estimatedAmount?: number;
  }
) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findFirst({
      where: { id: eventId, userId },
      include: { budgetCategories: true },
    });

    if (!event) {
      throw new Error("Event not found or access denied.");
    }

    // Check for duplicate category name within this event
    const exists = event.budgetCategories.some(
      (c) => c.name.toLowerCase() === data.name.trim().toLowerCase()
    );
    if (exists) {
      throw new Error(`Category "${data.name.trim()}" already exists for this event.`);
    }

    const currentTotalAllocatedCents = event.budgetCategories.reduce(
      (sum, c) => sum + toCents(Number(c.allocatedAmount)),
      0
    );
    const newAllocatedCents = toCents(data.allocatedAmount);
    const totalBudgetCents = toCents(Number(event.totalBudget));

    if (currentTotalAllocatedCents + newAllocatedCents > totalBudgetCents) {
      const exceededCents = currentTotalAllocatedCents + newAllocatedCents - totalBudgetCents;
      throw new Error(
        `Adding this category would exceed the total budget by ${fromCents(exceededCents)}.`
      );
    }

    const percentage = totalBudgetCents > 0
      ? Number(((newAllocatedCents / totalBudgetCents) * 100).toFixed(2))
      : 0;

    return tx.budgetCategory.create({
      data: {
        eventId,
        name: data.name.trim(),
        allocatedAmount: new Prisma.Decimal(data.allocatedAmount),
        allocatedPercentage: new Prisma.Decimal(percentage),
        estimatedAmount: new Prisma.Decimal(data.estimatedAmount ?? data.allocatedAmount),
      },
    });
  });
}

/**
 * Updates a budget category (name, allocation, estimation).
 * If allocation changes, verifies in a transaction that sum of categories does not exceed event budget.
 */
export async function updateBudgetCategory(
  categoryId: string,
  userId: string,
  data: {
    name?: string;
    allocatedAmount?: number;
    estimatedAmount?: number;
  }
) {
  return prisma.$transaction(async (tx) => {
    const category = await tx.budgetCategory.findUnique({
      where: { id: categoryId },
      include: {
        event: {
          include: { budgetCategories: true },
        },
      },
    });

    if (!category || category.event.userId !== userId) {
      throw new Error("Category not found or access denied.");
    }

    if (data.name && data.name.trim().toLowerCase() !== category.name.toLowerCase()) {
      const duplicate = category.event.budgetCategories.some(
        (c) => c.id !== categoryId && c.name.toLowerCase() === data.name!.trim().toLowerCase()
      );
      if (duplicate) {
        throw new Error(`Another category named "${data.name.trim()}" already exists.`);
      }
    }

    let nextAllocatedAmount = Number(category.allocatedAmount);
    let nextAllocatedPercentage = Number(category.allocatedPercentage);

    if (data.allocatedAmount !== undefined) {
      const targetCents = toCents(data.allocatedAmount);
      const totalBudgetCents = toCents(Number(category.event.totalBudget));

      const otherCategoriesCents = category.event.budgetCategories
        .filter((c) => c.id !== categoryId)
        .reduce((sum, c) => sum + toCents(Number(c.allocatedAmount)), 0);

      if (otherCategoriesCents + targetCents > totalBudgetCents) {
        const exceededCents = otherCategoriesCents + targetCents - totalBudgetCents;
        throw new Error(
          `Updating allocation would exceed the total budget by ${fromCents(exceededCents)}.`
        );
      }

      nextAllocatedAmount = data.allocatedAmount;
      nextAllocatedPercentage = totalBudgetCents > 0
        ? Number(((targetCents / totalBudgetCents) * 100).toFixed(2))
        : 0;
    }

    return tx.budgetCategory.update({
      where: { id: categoryId },
      data: {
        name: data.name ? data.name.trim() : undefined,
        allocatedAmount: data.allocatedAmount !== undefined ? new Prisma.Decimal(nextAllocatedAmount) : undefined,
        allocatedPercentage: new Prisma.Decimal(nextAllocatedPercentage),
        estimatedAmount: data.estimatedAmount !== undefined ? new Prisma.Decimal(data.estimatedAmount) : undefined,
      },
    });
  });
}

/**
 * Bulk adjusts category allocations atomically.
 * Ensures the sum of all updated category allocations does not exceed the event's total budget.
 */
export async function bulkAdjustCategoryAllocations(
  eventId: string,
  userId: string,
  allocations: { id: string; allocatedAmount: number }[]
) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findFirst({
      where: { id: eventId, userId },
      include: { budgetCategories: true },
    });

    if (!event) {
      throw new Error("Event not found or access denied.");
    }

    const categoryMap = new Map(event.budgetCategories.map((c) => [c.id, c]));
    const totalBudgetCents = toCents(Number(event.totalBudget));

    // Verify all requested categories belong to this event
    for (const item of allocations) {
      if (!categoryMap.has(item.id)) {
        throw new Error(`Category ${item.id} does not belong to this event.`);
      }
    }

    // Build proposed allocations combining updated and untouched categories
    const allocationUpdatesMap = new Map(allocations.map((a) => [a.id, toCents(a.allocatedAmount)]));
    let proposedSumCents = 0;

    for (const c of event.budgetCategories) {
      const cents = allocationUpdatesMap.has(c.id)
        ? allocationUpdatesMap.get(c.id)!
        : toCents(Number(c.allocatedAmount));

      if (cents < 0) {
        throw new Error(`Category "${c.name}" cannot have a negative allocation.`);
      }
      proposedSumCents += cents;
    }

    if (proposedSumCents > totalBudgetCents) {
      const exceededCents = proposedSumCents - totalBudgetCents;
      throw new Error(
        `Proposed category allocations (${fromCents(proposedSumCents)}) exceed event budget (${fromCents(totalBudgetCents)}) by ${fromCents(exceededCents)}.`
      );
    }

    // Update each category
    const results = [];
    for (const item of allocations) {
      const cents = toCents(item.allocatedAmount);
      const percentage = totalBudgetCents > 0
        ? Number(((cents / totalBudgetCents) * 100).toFixed(2))
        : 0;

      const updated = await tx.budgetCategory.update({
        where: { id: item.id },
        data: {
          allocatedAmount: new Prisma.Decimal(item.allocatedAmount),
          allocatedPercentage: new Prisma.Decimal(percentage),
        },
      });
      results.push(updated);
    }

    return results;
  });
}

/**
 * Deletes a budget category.
 * Prevents deletion if the category contains logged expenses.
 */
export async function deleteBudgetCategory(
  categoryId: string,
  userId: string
): Promise<boolean> {
  const category = await prisma.budgetCategory.findUnique({
    where: { id: categoryId },
    include: {
      event: true,
      expenses: { select: { id: true } },
    },
  });

  if (!category || category.event.userId !== userId) {
    throw new Error("Category not found or access denied.");
  }

  if (category.expenses.length > 0) {
    throw new Error(
      `Cannot delete category "${category.name}" because it contains ${category.expenses.length} recorded expense(s). Please reassign or delete the expenses first.`
    );
  }

  await prisma.budgetCategory.delete({
    where: { id: categoryId },
  });

  return true;
}

/**
 * Creates an actual expense under an event's budget category.
 * Enforces tenant ownership and category belonging.
 */
export async function createExpense(
  eventId: string,
  userId: string,
  data: {
    budgetCategoryId: string;
    name: string;
    amount: number;
    dateIncurred?: Date;
    paymentStatus?: "PENDING" | "PAID" | "OVERDUE";
    notes?: string | null;
  }
) {
  return prisma.$transaction(async (tx) => {
    // Verify event ownership
    const event = await tx.event.findFirst({
      where: { id: eventId, userId },
      select: { id: true },
    });

    if (!event) {
      throw new Error("Event not found or access denied.");
    }

    // Verify category belongs to this event
    const category = await tx.budgetCategory.findFirst({
      where: { id: data.budgetCategoryId, eventId },
    });

    if (!category) {
      throw new Error("Selected budget category does not belong to this event.");
    }

    if (data.amount <= 0) {
      throw new Error("Expense amount must be greater than zero.");
    }

    return tx.expense.create({
      data: {
        budgetCategoryId: data.budgetCategoryId,
        name: data.name.trim(),
        amount: new Prisma.Decimal(data.amount),
        dateIncurred: data.dateIncurred ?? new Date(),
        paymentStatus: data.paymentStatus ?? "PENDING",
        notes: data.notes?.trim() || null,
      },
    });
  });
}

/**
 * Updates an existing expense.
 * Verifies category and event ownership.
 */
export async function updateExpense(
  expenseId: string,
  userId: string,
  data: {
    budgetCategoryId?: string;
    name?: string;
    amount?: number;
    dateIncurred?: Date;
    paymentStatus?: "PENDING" | "PAID" | "OVERDUE";
    notes?: string | null;
  }
) {
  return prisma.$transaction(async (tx) => {
    const expense = await tx.expense.findUnique({
      where: { id: expenseId },
      include: {
        budgetCategory: {
          include: { event: true },
        },
      },
    });

    if (!expense || expense.budgetCategory.event.userId !== userId) {
      throw new Error("Expense not found or access denied.");
    }

    const eventId = expense.budgetCategory.eventId;

    // If changing category, ensure new category belongs to the same event
    if (data.budgetCategoryId && data.budgetCategoryId !== expense.budgetCategoryId) {
      const targetCategory = await tx.budgetCategory.findFirst({
        where: { id: data.budgetCategoryId, eventId },
      });
      if (!targetCategory) {
        throw new Error("Target category does not belong to this event.");
      }
    }

    if (data.amount !== undefined && data.amount <= 0) {
      throw new Error("Expense amount must be greater than zero.");
    }

    return tx.expense.update({
      where: { id: expenseId },
      data: {
        budgetCategoryId: data.budgetCategoryId,
        name: data.name ? data.name.trim() : undefined,
        amount: data.amount !== undefined ? new Prisma.Decimal(data.amount) : undefined,
        dateIncurred: data.dateIncurred,
        paymentStatus: data.paymentStatus,
        notes: data.notes !== undefined ? (data.notes ? data.notes.trim() : null) : undefined,
      },
    });
  });
}

/**
 * Deletes an expense record.
 */
export async function deleteExpense(
  expenseId: string,
  userId: string
): Promise<boolean> {
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      budgetCategory: {
        include: { event: true },
      },
    },
  });

  if (!expense || expense.budgetCategory.event.userId !== userId) {
    throw new Error("Expense not found or access denied.");
  }

  await prisma.expense.delete({
    where: { id: expenseId },
  });

  return true;
}
