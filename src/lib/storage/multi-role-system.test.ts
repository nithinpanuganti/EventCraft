import { describe, it, expect, beforeEach } from "vitest";
import { resetAllLocalData } from "./indexed-db";
import {
  getNavigationItemsForRole,
  ORGANIZER_NAVIGATION_ITEMS,
  COORDINATOR_NAVIGATION_ITEMS,
  VENDOR_NAVIGATION_ITEMS,
  GUEST_NAVIGATION_ITEMS,
} from "../navigation";
import {
  seedDemoAccountsAndEvents,
  getLocalProfiles,
  listLocalEvents,
  getLocalGuests,
  getLocalTables,
  getLocalVendorContracts,
  getLocalVendorPayments,
  getLocalRisks,
  getLocalEmergencyContacts,
  createLocalRisk,
  exportLocalGuestsToCsv,
  importLocalGuestsFromCsv,
} from "./local-repository";
import { generateIcsCalendar } from "../calendar/ics-export";
import { LocalEvent, LocalGuest } from "./types";

describe("Multi-Role Navigation & Permissions", () => {
  it("provides full 16-item navigation for ORGANIZER", () => {
    const nav = getNavigationItemsForRole("ORGANIZER");
    expect(nav).toEqual(ORGANIZER_NAVIGATION_ITEMS);
    expect(nav.some((item) => item.href === "/dashboard")).toBe(true);
    expect(nav.some((item) => item.href === "/guests")).toBe(true);
    expect(nav.some((item) => item.href === "/seating")).toBe(true);
    expect(nav.some((item) => item.href === "/venue-layout")).toBe(true);
    expect(nav.some((item) => item.href === "/risks")).toBe(true);
    expect(nav.some((item) => item.href === "/analytics")).toBe(true);
  });

  it("provides day-of operations navigation for COORDINATOR", () => {
    const nav = getNavigationItemsForRole("COORDINATOR");
    expect(nav).toEqual(COORDINATOR_NAVIGATION_ITEMS);
    expect(nav.some((item) => item.href === "/control-center")).toBe(true);
    expect(nav.some((item) => item.href === "/check-in")).toBe(true);
    expect(nav.some((item) => item.href === "/emergency-contacts")).toBe(true);
  });

  it("provides contracts and payments navigation for VENDOR", () => {
    const nav = getNavigationItemsForRole("VENDOR");
    expect(nav).toEqual(VENDOR_NAVIGATION_ITEMS);
    expect(nav.some((item) => item.href.includes("/vendors"))).toBe(true);
    expect(nav.some((item) => item.href === "/control-center")).toBe(true);
  });

  it("provides guest portal navigation for GUEST", () => {
    const nav = getNavigationItemsForRole("GUEST");
    expect(nav).toEqual(GUEST_NAVIGATION_ITEMS);
    expect(nav.some((item) => item.href === "/invitations?view=guest")).toBe(true);
    expect(nav.some((item) => item.href === "/check-in?view=pass")).toBe(true);
    expect(nav.some((item) => item.href === "/seating?view=guest")).toBe(true);
  });
});

describe("Demo System Seeder & 21-Store Hydration", () => {
  beforeEach(async () => {
    await resetAllLocalData();
  });

  it("seeds 4 demo profiles (Organizer, Coordinator, Vendor, Guest) and linked data", async () => {
    const result = await seedDemoAccountsAndEvents();
    expect(result.organizer.name).toBe("Elena Rostova");
    expect(result.coordinator.name).toBe("Marcus Vance");
    expect(result.vendor.name).toBe("Julian Cole (Apex Sound)");
    expect(result.guest.name).toBe("Dr. Sophia Lin");

    const profiles = await getLocalProfiles();
    expect(profiles.length).toBe(4);
    expect(profiles.some((p) => p.role === "ORGANIZER" && p.name === "Elena Rostova")).toBe(true);
    expect(profiles.some((p) => p.role === "COORDINATOR" && p.name === "Marcus Vance")).toBe(true);
    expect(profiles.some((p) => p.role === "VENDOR" && p.name === "Julian Cole (Apex Sound)")).toBe(true);
    expect(profiles.some((p) => p.role === "GUEST" && p.name === "Dr. Sophia Lin")).toBe(true);

    const events = await listLocalEvents();
    expect(events.length).toBeGreaterThan(0);
    const eventId = result.eventId;

    // Check guests and tables
    const guests = await getLocalGuests(eventId);
    expect(guests.length).toBeGreaterThan(0);
    const tables = await getLocalTables(eventId);
    expect(tables.length).toBeGreaterThan(0);

    // Check contracts, payments, risks, emergency contacts
    const contracts = await getLocalVendorContracts(eventId);
    expect(contracts.length).toBeGreaterThan(0);
    const payments = await getLocalVendorPayments(eventId);
    expect(payments.length).toBeGreaterThan(0);
    const risks = await getLocalRisks(eventId);
    expect(risks.length).toBeGreaterThan(0);
    const emergencyContacts = await getLocalEmergencyContacts(eventId);
    expect(emergencyContacts.length).toBeGreaterThan(0);
  });
});

describe("Risk Priority & Scoring Engine", () => {
  it("computes priority level and score deterministically", async () => {
    const events = await listLocalEvents();
    const eventId = events[0]?.id || "evt-test";

    // Critical (3 x 5 = 15 or 4 x 4 = 16)
    const criticalRisk = await createLocalRisk({
      eventId,
      title: "Main Power Outage",
      category: "EQUIPMENT",
      likelihood: 4,
      severity: 5,
      owner: "Electrician",
      mitigationStrategy: "Backup generator ready",
      contingencyPlan: "Immediate switchover",
      status: "IDENTIFIED",
    });

    expect(criticalRisk.priorityScore).toBe(20);
    expect(criticalRisk.priorityLevel).toBe("CRITICAL");

    // Low risk (1 x 2 = 2)
    const lowRisk = await createLocalRisk({
      eventId,
      title: "Minor floral arrangement delay",
      category: "VENDOR",
      likelihood: 1,
      severity: 2,
      owner: "Florist",
      mitigationStrategy: "Delivery confirmed 2hr prior",
      contingencyPlan: "Alternative centerpieces",
      status: "IDENTIFIED",
    });

    expect(lowRisk.priorityScore).toBe(2);
    expect(lowRisk.priorityLevel).toBe("LOW");
  });
});

describe("CSV Guest Export and Import", () => {
  it("exports guests to valid CSV format and can re-import them", async () => {
    const sampleGuests: LocalGuest[] = [
      {
        id: "g-1",
        eventId: "evt-1",
        name: "Arthur Pendelton",
        email: "arthur@example.com",
        phone: "+1 555-0199",
        category: "VIP",
        invitationStatus: "SENT",
        rsvpStatus: "CONFIRMED",
        plusOneAllowed: true,
        plusOneCount: 1,
        plusOneNames: ["Guinevere"],
        dietaryPreferences: ["Gluten-Free"],
        checkInStatus: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const csv = exportLocalGuestsToCsv(sampleGuests);
    expect(csv).toContain("Arthur Pendelton");
    expect(csv).toContain("arthur@example.com");
    expect(csv).toContain("VIP");

    const imported = await importLocalGuestsFromCsv("evt-1", csv);
    expect(imported.created).toBeGreaterThanOrEqual(1);
  });
});

describe("Calendar .ICS Generator", () => {
  it("generates valid RFC 5545 iCalendar specification", () => {
    const sampleEvent: LocalEvent = {
      id: "evt-ics-test",
      profileId: "prof-1",
      title: "Gala Evening Celebration",
      type: "COMMUNITY",
      eventDate: "2026-12-25",
      location: "Grand Ballroom",
      guestCount: 150,
      totalBudget: 25000,
      totalBudgetCents: 2500000,
      currency: "USD",
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ics = generateIcsCalendar(sampleEvent);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("SUMMARY:Gala Evening Celebration");
    expect(ics).toContain("LOCATION:Grand Ballroom");
    expect(ics).toContain("END:VCALENDAR");
  });
});
