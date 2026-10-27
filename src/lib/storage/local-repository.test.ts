import { describe, it, expect, beforeEach } from "vitest";
import { resetAllLocalData } from "./indexed-db";
import {
  createLocalProfile,
  getLocalProfiles,
  verifyLocalProfilePasscode,
  createLocalEvent,
  getLocalEvents,
  createLocalTask,
  getLocalTasksWithDependencies,
  updateLocalTaskStatus,
  createLocalVendor,
  getLocalVendors,
  addLocalVendorQuote,
  selectLocalVendorQuote,
  createLocalBudgetCategory,
  getLocalBudgetCategories,
  createLocalExpense,
  getLocalExpenses,
} from "./local-repository";

describe("Domain Local Repository Operations", () => {
  beforeEach(async () => {
    await resetAllLocalData();
  });

  it("manages local browser profiles with hashed passcodes", async () => {
    const profile = await createLocalProfile({
      name: "Jordan Lee",
      email: "jordan@browser.local",
      passcode: "secure1234",
    });

    expect(profile.id).toBeDefined();
    expect(profile.name).toBe("Jordan Lee");
    expect(profile.passcodeHash).toBeDefined();
    expect(profile.passcodeHash).not.toBe("secure1234"); // Not plaintext

    const verified = await verifyLocalProfilePasscode(profile.id, "secure1234");
    expect(verified).toBe(true);

    const wrong = await verifyLocalProfilePasscode(profile.id, "wrongPass");
    expect(wrong).toBe(false);

    const profiles = await getLocalProfiles();
    expect(profiles).toHaveLength(1);
  });

  it("handles event creation and task dependency status", async () => {
    const profile = await createLocalProfile({
      name: "Event Lead",
      email: "lead@browser.local",
    });

    const event = await createLocalEvent(profile.id, {
      title: "Annual Product Launch",
      type: "COMMUNITY",
      eventDate: "2026-11-01",
      guestCount: 100,
      totalBudget: 15000,
    });

    expect(event.title).toBe("Annual Product Launch");
    expect(event.totalBudgetCents).toBe(1500000);

    // Create prerequisite task
    const taskA = await createLocalTask({
      eventId: event.id,
      title: "Finalize Venue Contract",
      phase: "BOOKING",
      priority: "CRITICAL",
    });

    // Create dependent task
    const taskB = await createLocalTask({
      eventId: event.id,
      title: "Pay Venue Deposit",
      phase: "BOOKING",
      priority: "HIGH",
      prerequisiteIds: [taskA.id],
    });

    const timelineData = await getLocalTasksWithDependencies(event.id);
    expect(timelineData.tasks).toHaveLength(2);

    const depTask = timelineData.tasks.find((t) => t.id === taskB.id);
    expect(depTask?.isBlockedByPrerequisites).toBe(true);
    expect(depTask?.blockingReason).toContain("Finalize Venue Contract");

    // Complete task A
    await updateLocalTaskStatus(taskA.id, "IN_PROGRESS");
    await updateLocalTaskStatus(taskA.id, "COMPLETED");

    const refreshed = await getLocalTasksWithDependencies(event.id);
    const refreshedDep = refreshed.tasks.find((t) => t.id === taskB.id);
    expect(refreshedDep?.isBlockedByPrerequisites).toBe(false);
  });

  it("handles vendor quotes and selection", async () => {
    const profile = await createLocalProfile({
      name: "Organizer",
      email: "org@browser.local",
    });

    const event = await createLocalEvent(profile.id, {
      title: "Community Fundraiser",
      type: "COMMUNITY",
      totalBudget: 5000,
    });

    const vendor = await createLocalVendor({
      eventId: event.id,
      companyName: "Starlight Sound & Lights",
      categoryName: "AV & Production",
    });

    expect(vendor.status).toBe("RESEARCHING");

    const quote = await addLocalVendorQuote({
      vendorId: vendor.id,
      eventId: event.id,
      description: "Standard PA System & 4 Mics",
      quotedAmount: 850,
      isSelected: false,
    });

    const vendorsAfterQuote = await getLocalVendors(event.id);
    expect(vendorsAfterQuote[0].quotes).toHaveLength(1);
    expect(vendorsAfterQuote[0].status).toBe("QUOTED");

    // Select the quote
    await selectLocalVendorQuote(event.id, quote.id);

    const vendorsAfterSelect = await getLocalVendors(event.id);
    expect(vendorsAfterSelect[0].status).toBe("BOOKED");
    expect(vendorsAfterSelect[0].quotes[0].isSelected).toBe(true);
  });

  it("manages local budget categories and expenses", async () => {
    const profile = await createLocalProfile({
      name: "Finance Planner",
      email: "finance@browser.local",
    });

    const event = await createLocalEvent(profile.id, {
      title: "Charity Gala",
      type: "COMMUNITY",
      totalBudget: 10000,
    });

    const events = await getLocalEvents(profile.id);
    expect(events).toHaveLength(1);

    const category = await createLocalBudgetCategory(
      event.id,
      "Catering",
      4000
    );

    const categories = await getLocalBudgetCategories(event.id);
    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe("Catering");
    expect(categories[0].allocatedCents).toBe(400000);

    const expense = await createLocalExpense({
      eventId: event.id,
      categoryId: category.id,
      title: "Appetizers Deposit",
      amount: 1200,
      paymentStatus: "PAID",
      paidDate: new Date().toISOString(),
    });

    expect(expense.id).toBeDefined();
    const expenses = await getLocalExpenses(event.id);
    expect(expenses).toHaveLength(1);
    expect(expenses[0].title).toBe("Appetizers Deposit");
    expect(expenses[0].amountCents).toBe(120000);
  });
});
