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
    status: "ACTIVE",
    preferences: {},
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

  it("interprets 'show remaining budget' query commands without proposing mutations", () => {
    const res = interpretLocalPlanningCommand(
      mockEvent,
      "show remaining budget"
    );

    expect(res.intent).toBe("SHOW_BUDGET_STATUS");
    expect(res.proposedOperations).toHaveLength(0);
    expect(res.advisoryResponse).toContain("Remaining unspent budget is");
  });

  it("provides clear feedback and supported command guide on unknown commands", () => {
    const res = interpretLocalPlanningCommand(
      mockEvent,
      "write me an essay about Shakespeare"
    );

    expect(res.intent).toBe("UNSUPPORTED_COMMAND");
    expect(res.advisoryResponse).toContain("didn't recognize that command");
    expect(res.advisoryResponse).toContain("add task");
  });
});
