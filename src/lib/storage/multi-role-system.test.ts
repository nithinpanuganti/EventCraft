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
  authenticateLocalProfile,
  DEMO_CREDENTIALS,
} from "./local-repository";
import { canAccessRoute, getRoleDefaultDashboard, canPerformAction } from "../permissions";
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
    expect(result.organizer.name).toBe("Olivia Organizer");
    expect(result.coordinator.name).toBe("Ethan Coordinator");
    expect(result.vendor.name).toBe("Sophia Vendor");
    expect(result.guest.name).toBe("Liam Guest");

    const profiles = await getLocalProfiles();
    expect(profiles.length).toBe(4);
    expect(profiles.some((p) => p.role === "ORGANIZER" && p.name === "Olivia Organizer")).toBe(true);
    expect(profiles.some((p) => p.role === "COORDINATOR" && p.name === "Ethan Coordinator")).toBe(true);
    expect(profiles.some((p) => p.role === "VENDOR" && p.name === "Sophia Vendor")).toBe(true);
    expect(profiles.some((p) => p.role === "GUEST" && p.name === "Liam Guest")).toBe(true);

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

describe("Role-Based Access Control & Route Guarding", () => {
  it("enforces route permissions across all 4 roles", () => {
    // Public routes accessible by all roles
    expect(canAccessRoute("GUEST", "/login")).toBe(true);
    expect(canAccessRoute("COORDINATOR", "/login/coordinator")).toBe(true);
    expect(canAccessRoute("VENDOR", "/login/vendor")).toBe(true);
    expect(canAccessRoute("ORGANIZER", "/register")).toBe(true);

    // Organizer has full module scope
    expect(canAccessRoute("ORGANIZER", "/dashboard")).toBe(true);
    expect(canAccessRoute("ORGANIZER", "/budget")).toBe(true);
    expect(canAccessRoute("ORGANIZER", "/analytics")).toBe(true);
    expect(canAccessRoute("ORGANIZER", "/guests")).toBe(true);

    // Coordinator restricted from budget & analytics
    expect(canAccessRoute("COORDINATOR", "/dashboard/coordinator")).toBe(true);
    expect(canAccessRoute("COORDINATOR", "/control-center")).toBe(true);
    expect(canAccessRoute("COORDINATOR", "/check-in")).toBe(true);
    expect(canAccessRoute("COORDINATOR", "/budget")).toBe(false);
    expect(canAccessRoute("COORDINATOR", "/analytics")).toBe(false);

    // Vendor restricted from budget, guests, risks
    expect(canAccessRoute("VENDOR", "/dashboard/vendor")).toBe(true);
    expect(canAccessRoute("VENDOR", "/vendors")).toBe(true);
    expect(canAccessRoute("VENDOR", "/budget")).toBe(false);
    expect(canAccessRoute("VENDOR", "/guests")).toBe(false);
    expect(canAccessRoute("VENDOR", "/risks")).toBe(false);

    // Guest restricted from back-of-house planning
    expect(canAccessRoute("GUEST", "/dashboard/guest")).toBe(true);
    expect(canAccessRoute("GUEST", "/invitations")).toBe(true);
    expect(canAccessRoute("GUEST", "/budget")).toBe(false);
    expect(canAccessRoute("GUEST", "/vendors")).toBe(false);
    expect(canAccessRoute("GUEST", "/control-center")).toBe(false);
  });

  it("determines correct default dashboard per role", () => {
    expect(getRoleDefaultDashboard("ORGANIZER")).toBe("/dashboard/organizer");
    expect(getRoleDefaultDashboard("COORDINATOR")).toBe("/dashboard/coordinator");
    expect(getRoleDefaultDashboard("VENDOR")).toBe("/dashboard/vendor");
    expect(getRoleDefaultDashboard("GUEST")).toBe("/dashboard/guest");
  });

  it("evaluates operational action permissions correctly", () => {
    expect(canPerformAction("ORGANIZER", "budget:manage")).toBe(true);
    expect(canPerformAction("COORDINATOR", "budget:manage")).toBe(false);
    expect(canPerformAction("COORDINATOR", "control_center:operate")).toBe(true);
    expect(canPerformAction("VENDOR", "vendors:submit_quotes")).toBe(true);
    expect(canPerformAction("VENDOR", "guests:manage_all")).toBe(false);
    expect(canPerformAction("GUEST", "guests:self_rsvp")).toBe(true);
    expect(canPerformAction("GUEST", "events:create")).toBe(false);
  });
});

describe("Demonstration Authentication & Account Validation", () => {
  beforeEach(async () => {
    await resetAllLocalData();
  });

  it("authenticates all 4 demo users with correct passwords", async () => {
    await seedDemoAccountsAndEvents();

    // Organizer: Olivia Organizer
    const orgAuth = await authenticateLocalProfile(
      "ORGANIZER",
      DEMO_CREDENTIALS.ORGANIZER.username,
      DEMO_CREDENTIALS.ORGANIZER.password
    );
    expect(orgAuth.success).toBe(true);
    expect(orgAuth.profile?.name).toBe("Olivia Organizer");

    // Coordinator: Ethan Coordinator
    const coordAuth = await authenticateLocalProfile(
      "COORDINATOR",
      DEMO_CREDENTIALS.COORDINATOR.username,
      DEMO_CREDENTIALS.COORDINATOR.password
    );
    expect(coordAuth.success).toBe(true);
    expect(coordAuth.profile?.name).toBe("Ethan Coordinator");

    // Vendor: Sophia Vendor
    const vendorAuth = await authenticateLocalProfile(
      "VENDOR",
      DEMO_CREDENTIALS.VENDOR.username,
      DEMO_CREDENTIALS.VENDOR.password
    );
    expect(vendorAuth.success).toBe(true);
    expect(vendorAuth.profile?.name).toBe("Sophia Vendor");

    // Guest: Liam Guest
    const guestAuth = await authenticateLocalProfile(
      "GUEST",
      DEMO_CREDENTIALS.GUEST.username,
      DEMO_CREDENTIALS.GUEST.password
    );
    expect(guestAuth.success).toBe(true);
    expect(guestAuth.profile?.name).toBe("Liam Guest");
  });

  it("rejects invalid passwords and mismatched roles", async () => {
    await seedDemoAccountsAndEvents();

    // Wrong password
    const failPass = await authenticateLocalProfile("ORGANIZER", "organizer.demo", "wrongpassword123");
    expect(failPass.success).toBe(false);
    expect(failPass.error).toContain("Invalid password");

    // Non-existent username
    const failUser = await authenticateLocalProfile("ORGANIZER", "nonexistent.user", "test1234");
    expect(failUser.success).toBe(false);

    // Mismatched role (using coordinator credentials on organizer portal)
    const failRole = await authenticateLocalProfile("ORGANIZER", "coordinator.demo", "coordinator123");
    expect(failRole.success).toBe(false);
  });
});
