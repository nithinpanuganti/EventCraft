import { describe, it, expect, beforeEach } from "vitest";
import {
  dbPut,
  dbGet,
  dbGetAll,
  dbDelete,
  exportDatabaseBackup,
  importDatabaseBackup,
  resetAllLocalData,
} from "./indexed-db";
import { LocalProfile, LocalEvent, LocalDatabaseBackup } from "./types";

describe("Browser Local Storage & IndexedDB Fallback", () => {
  beforeEach(async () => {
    await resetAllLocalData();
  });

  it("stores, retrieves, and deletes profile records", async () => {
    const profile: LocalProfile = {
      id: "prof_test_1",
      name: "Alex Planner",
      email: "alex@local.dev",
      passcodeHash: "hash123",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dbPut("profiles", profile);
    const retrieved = await dbGet<LocalProfile>("profiles", "prof_test_1");

    expect(retrieved).not.toBeNull();
    expect(retrieved?.name).toBe("Alex Planner");
    expect(retrieved?.email).toBe("alex@local.dev");

    const all = await dbGetAll<LocalProfile>("profiles");
    expect(all).toHaveLength(1);

    await dbDelete("profiles", "prof_test_1");
    const afterDelete = await dbGet<LocalProfile>("profiles", "prof_test_1");
    expect(afterDelete).toBeNull();
  });

  it("exports a versioned database backup", async () => {
    const event: LocalEvent = {
      id: "evt_backup_test",
      profileId: "prof_1",
      title: "Silver Jubilee Celebration",
      type: "WEDDING",
      eventDate: "2026-11-20",
      location: "Grand Ballroom",
      guestCount: 150,
      totalBudget: 25000,
      totalBudgetCents: 2500000,
      currency: "USD",
      status: "ACTIVE",
      preferences: { themePreferences: "Classic Silver" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dbPut("events", event);
    const backup = await exportDatabaseBackup();

    expect(backup.schemaVersion).toBe(1);
    expect(backup.appName).toBe("EventCraft AI");
    expect(backup.events).toHaveLength(1);
    expect(backup.events[0].title).toBe("Silver Jubilee Celebration");
  });

  it("imports a valid database backup safely", async () => {
    const backup: LocalDatabaseBackup = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      appName: "EventCraft AI",
      appVersion: "0.2.0-local",
      profiles: [
        {
          id: "prof_imported",
          name: "Imported User",
          email: "imported@local.dev",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      events: [
        {
          id: "evt_imported",
          profileId: "prof_imported",
          title: "Imported Gala",
          type: "COMMUNITY",
          eventDate: "2026-12-31",
          guestCount: 200,
          totalBudget: 50000,
          totalBudgetCents: 5000000,
          currency: "USD",
          status: "DRAFT",
          preferences: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      eventPlans: [],
      budgetCategories: [],
      expenses: [],
      tasks: [],
      vendors: [],
      vendorQuotes: [],
      planRevisions: [],
    };

    const result = await importDatabaseBackup(backup);
    expect(result.success).toBe(true);
    expect(result.recordCounts.profiles).toBe(1);
    expect(result.recordCounts.events).toBe(1);

    const savedEvent = await dbGet<LocalEvent>("events", "evt_imported");
    expect(savedEvent?.title).toBe("Imported Gala");
  });

  it("rejects malformed or unsupported backup schemas", async () => {
    await expect(importDatabaseBackup(null as unknown as LocalDatabaseBackup)).rejects.toThrow(
      "Invalid backup format"
    );

    await expect(
      importDatabaseBackup({ schemaVersion: 99 } as unknown as LocalDatabaseBackup)
    ).rejects.toThrow("Unsupported schema version 99");
  });
});
