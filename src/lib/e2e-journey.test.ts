import { describe, it, expect, vi } from "vitest";

// Mock prisma and auth modules
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    event: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(async ({ data }) => ({
        id: "event-e2e-123",
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      update: vi.fn(async ({ data }) => ({
        id: "event-e2e-123",
        ...data,
        updatedAt: new Date(),
      })),
      delete: vi.fn(),
    },
    eventPreferences: {
      create: vi.fn(),
      upsert: vi.fn(),
    },
    eventPlan: {
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    budgetCategory: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    expense: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    task: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    taskDependency: {
      create: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    vendor: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    vendorQuote: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    planRevision: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => cb(prisma)),
  },
}));

vi.mock("@/lib/planning/planning-service", () => ({
  PlanningService: class {
    generatePlan = vi.fn().mockResolvedValue({
      success: true,
      plan: {
        summary: {
          conceptTitle: "E2E Golden Celebration",
          conceptNarrative: "A harmonious grand celebration.",
          planningAssumptions: ["Assumption 1"],
          keyRecommendations: ["Book venue early"],
        },
        theme: {
          themeName: "Golden Sunset",
          colorPalette: ["#FFD700", "#FFF8DC"],
          styleDirection: "Warm and elegant",
          decorationIdeas: ["Fairylights"],
          personalizedActivities: ["Welcome toast"],
          culturalConsiderations: [],
        },
        budget: {
          totalBudget: 15000,
          currency: "USD",
          categories: [
            { categoryName: "Venue & Catering", allocatedPercentage: 60, allocatedAmount: 9000, estimatedAmount: 9000 },
            { categoryName: "Photography", allocatedPercentage: 20, allocatedAmount: 3000, estimatedAmount: 3000 },
            { categoryName: "Decor & Sound", allocatedPercentage: 20, allocatedAmount: 3000, estimatedAmount: 3000 },
          ],
          contingencyPercentage: 5,
          isBalanced: true,
        },
        milestones: [],
        tasks: [
          { title: "Confirm venue contract", phase: "BOOKING", priority: "HIGH", category: "Venue" },
          { title: "Send invitations", phase: "PREPARATION", priority: "MEDIUM", category: "Coordination" },
        ],
        dayOfSchedule: [
          { time: "16:00", activity: "Guest Arrival", lead: "Host", notes: "Welcome drinks" },
          { time: "18:00", activity: "Main Ceremony", lead: "Officiant", notes: "Seated guests" },
        ],
        vendors: [],
        risksAndAlternatives: {
          potentialRisks: ["Weather"],
          mitigations: ["Indoor backup"],
          budgetSavingTips: ["Digital invites"],
          optionalUpgrades: ["Live band"],
        },
        metadata: {
          source: "curated-fallback",
          provider: "Deterministic Engine",
          model: "standard",
          version: 1,
          generatedAt: new Date().toISOString(),
        },
      },
    });
    generateRaw = vi.fn().mockRejectedValue(new Error("AI offline mock"));
  },
}));

import { prisma } from "@/lib/prisma";
import { createEvent, saveEventPlan } from "@/lib/data-access/events";
import { createExpense } from "@/lib/budget/budget-service";
import { updateTaskStatus } from "@/lib/timeline/timeline-service";
import { createEventVendor, createVendorQuote, selectVendorQuote } from "@/lib/vendors/vendor-service";
import { generateRevisionProposal, applyRevisionProposal } from "@/lib/revisions/revision-service";
import { PlanningService } from "@/lib/planning/planning-service";
import { Prisma } from "@prisma/client";

describe("Critical End-to-End User Journey Simulation", () => {
  const USER_ID = "user-e2e-owner";
  const EVENT_ID = "event-e2e-123";

  it("completes the full lifecycle: Create -> Plan -> Expense -> Task -> Quote -> Revision", async () => {
    // 1. Create Event Draft
    const createdEvent = await createEvent(
      {
        type: "WEDDING",
        title: "E2E Nuptials",
        guestCount: 120,
        totalBudget: 15000,
        currency: "USD",
        themePreferences: "Golden Sunset",
      },
      USER_ID
    );
    expect(createdEvent).toBeDefined();
    expect(createdEvent.userId).toBe(USER_ID);
    expect(createdEvent.status).toBe("DRAFT");

    // 2. Generate and Persist Event Plan
    const planningService = new PlanningService();
    const planResult = await planningService.generatePlan({} as unknown as Parameters<typeof planningService.generatePlan>[0]);
    expect(planResult.success).toBe(true);

    vi.mocked(prisma.event.findFirst).mockResolvedValue({
      id: EVENT_ID,
      userId: USER_ID,
      title: "E2E Nuptials",
      plan: null,
    } as unknown as Awaited<ReturnType<typeof prisma.event.findFirst>>);

    vi.mocked(prisma.eventPlan.upsert).mockResolvedValue({
      id: "plan-1",
      eventId: EVENT_ID,
      conceptTitle: planResult.plan!.summary.conceptTitle,
      conceptNarrative: planResult.plan!.summary.conceptNarrative,
      dayOfSchedule: planResult.plan!.dayOfSchedule as unknown as Prisma.JsonValue,
      aiRecommendations: {} as unknown as Prisma.JsonValue,
      version: 1,
      generatedAt: new Date(),
      updatedAt: new Date(),
    });

    const persistedPlan = await saveEventPlan(EVENT_ID, USER_ID, planResult.plan!);
    expect(persistedPlan).toBeDefined();
    expect(persistedPlan?.version).toBe(1);

    // 3. Record Actual Expense
    vi.mocked(prisma.event.findFirst).mockResolvedValue({
      id: EVENT_ID,
      userId: USER_ID,
    } as unknown as Awaited<ReturnType<typeof prisma.event.findFirst>>);

    vi.mocked(prisma.budgetCategory.findFirst).mockResolvedValue({
      id: "cat-venue",
      eventId: EVENT_ID,
      name: "Venue & Catering",
    } as unknown as Awaited<ReturnType<typeof prisma.budgetCategory.findFirst>>);

    vi.mocked(prisma.expense.create).mockResolvedValue({
      id: "exp-deposit",
      budgetCategoryId: "cat-venue",
      name: "Ballroom 50% Deposit",
      amount: new Prisma.Decimal(4500),
      dateIncurred: new Date(),
      paymentStatus: "PAID",
      notes: "Receipt #2026-001",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const expense = await createExpense(EVENT_ID, USER_ID, {
      budgetCategoryId: "cat-venue",
      name: "Ballroom 50% Deposit",
      amount: 4500,
      paymentStatus: "PAID",
    });
    expect(expense.id).toBe("exp-deposit");
    expect(Number(expense.amount)).toBe(4500);

    // 4. Progress Task Status via State Machine
    vi.mocked(prisma.task.findUnique).mockResolvedValue({
      id: "task-venue-contract",
      eventId: EVENT_ID,
      status: "TODO",
      completedAt: null,
      event: { userId: USER_ID },
    } as unknown as Awaited<ReturnType<typeof prisma.task.findUnique>>);

    vi.mocked(prisma.task.update).mockResolvedValue({
      id: "task-venue-contract",
      eventId: EVENT_ID,
      title: "Confirm venue contract",
      description: null,
      phase: "BOOKING",
      priority: "HIGH",
      status: "IN_PROGRESS",
      dueDate: null,
      completedAt: null,
      order: 0,
      assignedTo: "Venue",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const inProgressTask = await updateTaskStatus("task-venue-contract", USER_ID, "IN_PROGRESS");
    expect(inProgressTask.status).toBe("IN_PROGRESS");

    // 5. Vendor & Quotation Selection
    vi.mocked(prisma.vendor.create).mockResolvedValue({
      id: "vendor-photo",
      eventId: EVENT_ID,
      categoryName: "Photography & Videography",
      companyName: "Artisan Memories",
      contactPerson: "Jane Photographer",
      email: "jane@artisanmemories.com",
      phone: "555-0199",
      websiteUrl: null,
      status: "RESEARCHING",
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const vendor = await createEventVendor(EVENT_ID, USER_ID, {
      categoryName: "Photography & Videography",
      companyName: "Artisan Memories",
      contactPerson: "Jane Photographer",
      email: "jane@artisanmemories.com",
    });
    expect(vendor.companyName).toBe("Artisan Memories");

    vi.mocked(prisma.vendor.findUnique).mockResolvedValue({
      id: "vendor-photo",
      eventId: EVENT_ID,
      status: "RESEARCHING",
      event: { id: EVENT_ID, userId: USER_ID },
    } as unknown as Awaited<ReturnType<typeof prisma.vendor.findUnique>>);

    vi.mocked(prisma.vendorQuote.create).mockResolvedValue({
      id: "quote-photo-pkg",
      vendorId: "vendor-photo",
      description: "8 Hours Coverage + Drone",
      quotedAmount: new Prisma.Decimal(2800),
      currency: "USD",
      validUntil: new Date("2027-01-01"),
      isSelected: false,
      quoteDocumentUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const quote = await createVendorQuote("vendor-photo", USER_ID, {
      description: "8 Hours Coverage + Drone",
      quotedAmount: 2800,
      currency: "USD",
    });
    expect(quote.id).toBe("quote-photo-pkg");

    // Select Quote Atomically
    vi.mocked(prisma.vendorQuote.findUnique).mockResolvedValue({
      id: "quote-photo-pkg",
      vendorId: "vendor-photo",
      vendor: {
        eventId: EVENT_ID,
        event: { id: EVENT_ID, userId: USER_ID },
      },
    } as unknown as Awaited<ReturnType<typeof prisma.vendorQuote.findUnique>>);

    vi.mocked(prisma.vendorQuote.update).mockResolvedValue({
      id: "quote-photo-pkg",
      vendorId: "vendor-photo",
      description: "8 Hours Coverage + Drone",
      quotedAmount: new Prisma.Decimal(2800),
      currency: "USD",
      validUntil: null,
      isSelected: true,
      quoteDocumentUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const selectedQuote = await selectVendorQuote("quote-photo-pkg", USER_ID, EVENT_ID);
    expect(selectedQuote.isSelected).toBe(true);

    // 6. Propose and Apply Conversational Plan Revision
    vi.mocked(prisma.event.findFirst).mockResolvedValue({
      id: EVENT_ID,
      userId: USER_ID,
      title: "E2E Nuptials",
      type: "WEDDING",
      eventDate: new Date("2027-06-15"),
      guestCount: 120,
      totalBudget: 15000,
      currency: "USD",
      preferences: {
        themeDescription: "Golden Sunset",
      },
      plan: {
        conceptTitle: "E2E Golden Celebration",
        version: 1,
      },
      budgetCategories: [],
      tasks: [],
      vendors: [],
      revisions: [],
    } as unknown as Awaited<ReturnType<typeof prisma.event.findFirst>>);

    const proposal = await generateRevisionProposal(
      EVENT_ID,
      USER_ID,
      "Increase budget to $18,000"
    );
    expect(proposal.intent).toBe("BUDGET_CHANGE");
    expect(proposal.classification).toBe("CONSEQUENTIAL");
    expect(proposal.requiresConfirmation).toBe(true);

    // Confirm & Apply Revision
    vi.mocked(prisma.planRevision.create).mockResolvedValue({
      id: "rev-e2e-1",
      eventId: EVENT_ID,
      version: 2,
      userPrompt: "Increase budget to $18,000",
      intent: "BUDGET_CHANGE",
      changeSummary: "Budget updated to 18000",
      diffPayload: {},
      applied: true,
      createdAt: new Date(),
    });

    const appliedRevision = await applyRevisionProposal(EVENT_ID, USER_ID, proposal);
    expect(appliedRevision.version).toBe(2);
    expect(appliedRevision.applied).toBe(true);
  });
});
