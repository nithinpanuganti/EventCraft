import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  getEventBudgetOverview,
  createBudgetCategory,
  deleteBudgetCategory,
  createExpense,
} from "./budget-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    budgetCategory: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    expense: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(async (callback) => {
      // Mock transaction runner passing prisma mock as tx
      return callback(prisma);
    }),
  },
}));

describe("Budget Service Security & Tenant Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const USER_A = "user-aaa-111";
  const USER_B = "user-bbb-222";
  const EVENT_A = "event-aaa-999";

  it("denies access when User B attempts to read User A's budget overview", async () => {
    // When querying for User B, prisma.event.findFirst returns null because of userId mismatch
    vi.mocked(prisma.event.findFirst).mockResolvedValue(null);

    const result = await getEventBudgetOverview(EVENT_A, USER_B);

    expect(result).toBeNull();
    expect(prisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: EVENT_A, userId: USER_B },
      })
    );
  });

  it("prevents User B from creating a budget category on User A's event", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue(null);

    await expect(
      createBudgetCategory(EVENT_A, USER_B, {
        name: "Malicious Category",
        allocatedAmount: 1000,
      })
    ).rejects.toThrow(/access denied/i);
  });

  it("prevents deleting a category that belongs to another user's event", async () => {
    vi.mocked(prisma.budgetCategory.findUnique).mockResolvedValue({
      id: "cat-1",
      eventId: EVENT_A,
      name: "Venue",
      allocatedPercentage: new Prisma.Decimal(50),
      allocatedAmount: new Prisma.Decimal(5000),
      estimatedAmount: new Prisma.Decimal(5000),
      createdAt: new Date(),
      updatedAt: new Date(),
      event: {
        id: EVENT_A,
        userId: USER_A, // Owner is User A
      },
      expenses: [],
    } as unknown as Awaited<ReturnType<typeof prisma.budgetCategory.findUnique>>);

    // User B tries to delete User A's category
    await expect(deleteBudgetCategory("cat-1", USER_B)).rejects.toThrow(/access denied/i);
  });

  it("prevents deleting a category that has recorded expenses", async () => {
    vi.mocked(prisma.budgetCategory.findUnique).mockResolvedValue({
      id: "cat-1",
      eventId: EVENT_A,
      name: "Catering",
      allocatedPercentage: new Prisma.Decimal(30),
      allocatedAmount: new Prisma.Decimal(3000),
      estimatedAmount: new Prisma.Decimal(3000),
      createdAt: new Date(),
      updatedAt: new Date(),
      event: {
        id: EVENT_A,
        userId: USER_A,
      },
      expenses: [{ id: "exp-1" }],
    } as unknown as Awaited<ReturnType<typeof prisma.budgetCategory.findUnique>>);

    await expect(deleteBudgetCategory("cat-1", USER_A)).rejects.toThrow(/contains 1 recorded expense/i);
  });

  it("prevents creating an expense with a category belonging to a different event", async () => {
    // User A owns EVENT_A
    vi.mocked(prisma.event.findFirst).mockResolvedValue({
      id: EVENT_A,
    } as unknown as Awaited<ReturnType<typeof prisma.event.findFirst>>);

    // But the category belongs to EVENT_OTHER, not EVENT_A
    vi.mocked(prisma.budgetCategory.findFirst).mockResolvedValue(null);

    await expect(
      createExpense(EVENT_A, USER_A, {
        budgetCategoryId: "foreign-cat-id",
        name: "Cross-event expense attempt",
        amount: 250,
      })
    ).rejects.toThrow(/does not belong to this event/i);
  });
});
