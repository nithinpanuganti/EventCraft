import { describe, it, expect } from "vitest";
import { interpretLocalPlanningCommand } from "./command-interpreter";
import { LocalEvent } from "../storage/types";

describe("Deterministic Planning Command Interpreter", () => {
  const mockEvent: LocalEvent = {
    id: "evt_1",
    profileId: "prof_1",
    title: "Tech Summit 2026",
    type: "COMMUNITY",
    eventDate: "2026-10-15",
    location: "Convention Center",
    guestCount: 300,
    totalBudget: 20000,
    totalBudgetCents: 2000000,
    currency: "USD",
    preferences: {},
    status: "ACTIVE",
    tasks: [
      {
        id: "task_1",
        eventId: "evt_1",
        title: "Book Catering Service",
        phase: "BOOKING",
        priority: "HIGH",
        status: "TODO",
        order: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    budgetCategories: [
      {
        id: "cat_1",
        eventId: "evt_1",
        name: "General",
        allocatedCents: 2000000,
        allocatedPercentage: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("interprets 'add task' commands correctly", () => {
    const res = interpretLocalPlanningCommand(
      mockEvent,
      "add task Review AV equipment contracts"
    );

    expect(res.intent).toBe("ADD_TASK");
    expect(res.changeSummary).toContain("Review AV equipment contracts");
    expect(res.proposedOperations[0].type).toBe("ADD_TASK");
    expect(res.proposedOperations[0].after.title).toBe("Review AV equipment contracts");
  });

  it("interprets 'complete task' commands correctly", () => {
    const res = interpretLocalPlanningCommand(
      mockEvent,
      "complete task Book Catering"
    );

    expect(res.intent).toBe("COMPLETE_TASK");
    expect(res.changeSummary).toContain("Book Catering Service");
    expect(res.proposedOperations[0].after.status).toBe("COMPLETED");
  });

  it("interprets 'change date' commands correctly", () => {
    const res = interpretLocalPlanningCommand(
      mockEvent,
      "change date to 2026-12-01"
    );

    expect(res.intent).toBe("CHANGE_EVENT_DATE");
    expect(res.changeSummary).toContain("2026-12-01");
    expect(res.proposedOperations[0].after.eventDate).toBe("2026-12-01");
  });

  it("interprets 'adjust budget' commands correctly", () => {
    const res = interpretLocalPlanningCommand(
      mockEvent,
      "adjust budget to 35000"
    );

    expect(res.intent).toBe("ADJUST_BUDGET");
    expect(res.changeSummary).toContain("35000");
    expect(res.proposedOperations[0].after.totalBudget).toBe(35000);
  });

  it("interprets 'add expense' commands correctly", () => {
    const res = interpretLocalPlanningCommand(
      mockEvent,
      "add expense Audio Visual Deposit 1500"
    );

    expect(res.intent).toBe("ADD_EXPENSE");
    expect(res.changeSummary).toContain("Audio Visual Deposit");
    expect(res.proposedOperations[0].type).toBe("ADD_EXPENSE");
    expect(res.proposedOperations[0].after.amount).toBe(1500);
  });

  it("interprets 'regenerate plan' as a consequential action requiring confirmation", () => {
    const res = interpretLocalPlanningCommand(
      mockEvent,
      "regenerate plan"
    );

    expect(res.intent).toBe("REGENERATE_PLAN");
    expect(res.classification).toBe("CONSEQUENTIAL");
    expect(res.requiresConfirmation).toBe(true);
  });

  it("interprets 'update theme' commands correctly", () => {
    const res = interpretLocalPlanningCommand(
      mockEvent,
      "update theme Modern Minimalist Emerald & Gold"
    );

    expect(res.intent).toBe("UPDATE_THEME");
    expect(res.proposedOperations[0].after.themePreferences).toBe("Modern Minimalist Emerald & Gold");
  });

  it("interprets 'show remaining budget' query commands without proposing mutations", () => {
    const res = interpretLocalPlanningCommand(
      mockEvent,
      "show remaining budget"
    );

    expect(res.intent).toBe("SHOW_BUDGET_STATUS");
    expect(res.classification).toBe("ADVISORY");
    expect(res.proposedOperations).toHaveLength(0);
    expect(res.advisoryResponse).toContain("20,000");
  });

  it("handles unsupported / unrecognized commands gracefully with command guide", () => {
    const res = interpretLocalPlanningCommand(
      mockEvent,
      "book a flight to Paris for everyone"
    );

    expect(res.intent).toBe("UNSUPPORTED_COMMAND");
    expect(res.classification).toBe("ADVISORY");
    expect(res.advisoryResponse).toContain("Supported Local Commands");
    expect(res.proposedOperations).toHaveLength(0);
  });
});
