import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  generateRevisionProposal,
  applyRevisionProposal,
  getEventRevisionHistory,
} from "./revision-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    eventPreferences: {
      upsert: vi.fn(),
    },
    eventPlan: {
      update: vi.fn(),
    },
    budgetCategory: {
      update: vi.fn(),
    },
    task: {
      create: vi.fn(),
      delete: vi.fn(),
    },
    planRevision: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => cb(prisma)),
  },
}));

vi.mock("@/lib/planning/planning-service", () => {
  return {
    PlanningService: class {
      generateRaw = vi.fn().mockRejectedValue(new Error("AI service offline for mock test"));
    },
  };
});

describe("Conversational Plan Revision Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const USER_A = "user-111";
  const USER_B = "user-222";
  const EVENT_A = "event-aaa";

  const mockEventContext = {
    id: EVENT_A,
    userId: USER_A,
    title: "Summer Wedding",
    type: "WEDDING",
    eventDate: new Date("2027-06-15"),
    guestCount: 100,
    totalBudget: 25000,
    currency: "USD",
    preferences: {
      themeDescription: "Vintage Garden",
      colorPalette: "Sage & Ivory",
      dietaryRestrictions: "Vegetarian options",
      accessibilityRequirements: null,
    },
    plan: {
      conceptTitle: "Vintage Garden Celebration",
      conceptNarrative: "A warm garden wedding.",
      version: 1,
    },
    budgetCategories: [
      { id: "c1", name: "Venue", allocatedAmount: 10000, allocatedPercentage: 40, expenses: [] },
      { id: "c2", name: "Catering", allocatedAmount: 8000, allocatedPercentage: 32, expenses: [] },
    ],
    tasks: [],
    vendors: [],
    revisions: [],
  };

  it("denies generating revisions for another user's event", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue(null);

    await expect(
      generateRevisionProposal(EVENT_A, USER_B, "Reduce budget to $20,000")
    ).rejects.toThrow(/access denied/i);
  });

  it("generates a consequential revision proposal for budget adjustment with requiresConfirmation=true", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue(
      mockEventContext as unknown as Awaited<ReturnType<typeof prisma.event.findFirst>>
    );

    const proposal = await generateRevisionProposal(
      EVENT_A,
      USER_A,
      "Please reduce the total budget to $20,000"
    );

    expect(proposal.intent).toBe("BUDGET_CHANGE");
    expect(proposal.classification).toBe("CONSEQUENTIAL");
    expect(proposal.requiresConfirmation).toBe(true);
    expect(proposal.proposedOperations).toHaveLength(1);
    expect(proposal.proposedOperations[0].type).toBe("UPDATE_EVENT");
    expect(proposal.proposedOperations[0].after.totalBudget).toBe(20000);
  });

  it("generates a consequential revision proposal for guest count adjustment", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue(
      mockEventContext as unknown as Awaited<ReturnType<typeof prisma.event.findFirst>>
    );

    const proposal = await generateRevisionProposal(
      EVENT_A,
      USER_A,
      "Increase attendees to 150 guests"
    );

    expect(proposal.intent).toBe("GUEST_COUNT_CHANGE");
    expect(proposal.classification).toBe("CONSEQUENTIAL");
    expect(proposal.requiresConfirmation).toBe(true);
    expect(proposal.proposedOperations[0].after.guestCount).toBe(150);
  });

  it("generates a low-risk edit proposal for theme adjustment", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue(
      mockEventContext as unknown as Awaited<ReturnType<typeof prisma.event.findFirst>>
    );

    const proposal = await generateRevisionProposal(
      EVENT_A,
      USER_A,
      "Change the theme style to Bohemian Sunset"
    );

    expect(proposal.intent).toBe("THEME_ADJUSTMENT");
    expect(proposal.classification).toBe("LOW_RISK_EDIT");
    expect(proposal.requiresConfirmation).toBe(false);
  });

  it("applies confirmed revisions atomically and increments plan version", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue(
      mockEventContext as unknown as Awaited<ReturnType<typeof prisma.event.findFirst>>
    );
    vi.mocked(prisma.planRevision.create).mockResolvedValue({
      id: "rev-1",
      eventId: EVENT_A,
      version: 2,
      userPrompt: "Reduce budget to $20000",
      intent: "BUDGET_CHANGE",
      changeSummary: "Budget updated",
      diffPayload: {},
      applied: true,
      createdAt: new Date(),
    });

    const proposal = {
      userPrompt: "Reduce budget to $20,000",
      intent: "BUDGET_CHANGE",
      classification: "CONSEQUENTIAL" as const,
      requiresConfirmation: true,
      advisoryResponse: "Adjusting budget.",
      changeSummary: "Reduced budget to 20000",
      proposedOperations: [
        {
          type: "UPDATE_EVENT" as const,
          targetId: EVENT_A,
          description: "Change budget to 20000",
          after: { totalBudget: 20000 },
        },
      ],
    };

    const result = await applyRevisionProposal(EVENT_A, USER_A, proposal);

    expect(prisma.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: EVENT_A },
      })
    );

    expect(prisma.eventPlan.update).toHaveBeenCalledWith({
      where: { eventId: EVENT_A },
      data: { version: 2 },
    });

    expect(result.version).toBe(2);
  });

  it("denies access when retrieving revision history of another user's event", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue(null);

    const history = await getEventRevisionHistory(EVENT_A, USER_B);
    expect(history).toBeNull();
  });
});
