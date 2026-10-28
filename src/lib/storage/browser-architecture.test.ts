import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetAllLocalData, importDatabaseBackup, exportDatabaseBackup } from "./indexed-db";
import {
  createLocalProfile,
  getLocalProfiles,
  getActiveLocalProfile,
  setActiveLocalProfile,
  deleteLocalProfile,
  resetMemorySession,
  createLocalEvent,
  getLocalEvent,
  updateLocalEvent,
  deleteLocalEvent,
  listLocalEvents,
  createLocalTask,
  getLocalTasksWithDependencies,
  createLocalVendor,
  createLocalBudgetCategory,
  createLocalExpense,
  generateAndSaveLocalPlan,
} from "./local-repository";
import { NAVIGATION_ITEMS } from "../navigation";

describe("Browser-Only Architecture & Zero-API Verification", () => {
  beforeEach(async () => {
    await resetAllLocalData();
    resetMemorySession();
  });

  it("ensures entire local planning & persistence lifecycle performs zero network requests", async () => {
    // Spy on global fetch
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    // 1. Create Profile
    const profile = await createLocalProfile({
      name: "Offline Specialist",
      email: "offline@eventcraft.local",
    });

    // 2. Create Event
    const event = await createLocalEvent(profile.id, {
      title: "Zero-Network Conference",
      type: "COMMUNITY",
      eventDate: "2026-12-10",
      guestCount: 200,
      totalBudget: 25000,
      currency: "USD",
    });

    // 3. Generate Local Rule-based Plan
    const plan = await generateAndSaveLocalPlan(event.id);
    expect(plan).toBeDefined();
    expect(plan?.conceptTitle).toContain("Community");

    // 4. Create Task & Budget Category
    const task = await createLocalTask({
      eventId: event.id,
      title: "Confirm Local Venue Audio",
      phase: "BOOKING",
      priority: "HIGH",
    });
    expect(task.id).toBeDefined();

    const category = await createLocalBudgetCategory(event.id, "Staging", 5000);
    const expense = await createLocalExpense({
      eventId: event.id,
      categoryId: category.id,
      title: "Stage Rental Deposit",
      amount: 1500,
      paymentStatus: "PAID",
    });
    expect(expense.id).toBeDefined();

    // 5. Create Vendor & Quote
    const vendor = await createLocalVendor({
      eventId: event.id,
      companyName: "Local Stage Co",
      categoryName: "Venues & Halls",
    });
    expect(vendor.id).toBeDefined();

    // 6. Export Database Backup
    const backup = await exportDatabaseBackup();
    expect(backup.events).toHaveLength(1);
    expect(backup.tasks.length).toBeGreaterThanOrEqual(1);

    // Assert: Zero fetch calls were triggered throughout the entire flow
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("handles profile switching and deletion with default fallback", async () => {
    const profA = await createLocalProfile({ name: "Alice", email: "alice@local" });
    const profB = await createLocalProfile({ name: "Bob", email: "bob@local" });

    // profB was created last so it is active
    let active = await getActiveLocalProfile();
    expect(active.id).toBe(profB.id);

    // Switch to Alice
    const switched = await setActiveLocalProfile(profA.id);
    expect(switched.id).toBe(profA.id);

    active = await getActiveLocalProfile();
    expect(active.id).toBe(profA.id);

    // Switch back to Bob and delete Bob
    await setActiveLocalProfile(profB.id);
    await deleteLocalProfile(profB.id);

    const remainingProfiles = await getLocalProfiles();
    expect(remainingProfiles).toHaveLength(1);
    expect(remainingProfiles[0].id).toBe(profA.id);

    active = await getActiveLocalProfile();
    expect(active.id).toBe(profA.id);
  });

  it("handles event creation, editing, and deletion with cascading cleanup", async () => {
    const profile = await createLocalProfile({ name: "Planner", email: "p@local" });
    const event = await createLocalEvent(profile.id, {
      title: "Summer Solstice",
      type: "COMMUNITY",
      totalBudget: 8000,
    });

    await createLocalTask({
      eventId: event.id,
      title: "Book Park Permit",
      phase: "PLANNING",
      priority: "CRITICAL",
    });

    const category = await createLocalBudgetCategory(event.id, "Permits", 500);
    await createLocalExpense({
      eventId: event.id,
      categoryId: category.id,
      title: "City Permit Fee",
      amount: 250,
      paymentStatus: "PAID",
    });

    // Update event details
    const updated = await updateLocalEvent(event.id, {
      title: "Summer Solstice Festival 2026",
      guestCount: 350,
    });
    expect(updated.title).toBe("Summer Solstice Festival 2026");
    expect(updated.guestCount).toBe(350);

    // Delete event -> should clean up and remove from event listings
    await deleteLocalEvent(event.id);
    const afterDelete = await getLocalEvent(event.id);
    expect(afterDelete).toBeNull();

    const remainingEvents = await listLocalEvents(profile.id);
    expect(remainingEvents).toHaveLength(0);

    const remainingTasks = await getLocalTasksWithDependencies(event.id);
    expect(remainingTasks.tasks).toHaveLength(0);
  });

  it("safely rejects malformed or corrupted backup files during import", async () => {
    // Malformed JSON data (missing required schemaVersion and appVersion)
    const corruptedBackup = {
      somethingRandom: true,
      invalidData: 12345,
    };

    await expect(
      importDatabaseBackup(corruptedBackup as unknown as Parameters<typeof importDatabaseBackup>[0])
    ).rejects.toThrow();
  });

  it("verifies all client navigation items point to valid local application routes", () => {
    expect(NAVIGATION_ITEMS.length).toBeGreaterThanOrEqual(6);

    const validRoutes = [
      "/dashboard",
      "/events",
      "/planner",
      "/budget",
      "/timeline",
      "/vendors",
      "/settings",
    ];

    for (const item of NAVIGATION_ITEMS) {
      expect(validRoutes).toContain(item.href);
      expect(item.name).toBeDefined();
      expect(item.icon).toBeDefined();
    }
  });
});
