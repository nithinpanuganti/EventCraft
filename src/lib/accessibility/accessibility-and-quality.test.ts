import { describe, it, expect } from "vitest";
import {
  sanitizeCsvCell,
  parseCsvLine,
  exportLocalGuestsToCsv,
  importLocalGuestsFromCsv,
} from "../storage/local-repository";
import {
  isUserRole,
  isGuestCategory,
  isRsvpStatus,
  isTableShape,
  isRiskCategory,
  isDocumentCategory,
  isEmergencyContactCategory,
  LocalGuest,
} from "../storage/types";
import { calculateRiskPriority } from "../storage/local-repository";

describe("CSV Formula Injection Protection (CWE-1236)", () => {
  it("prefixes formula injection triggers with single quotes", () => {
    expect(sanitizeCsvCell("=SUM(A1:A10)")).toBe(`"'=SUM(A1:A10)"`);
    expect(sanitizeCsvCell("+cmd|' /C calc'!A0")).toBe(`"'+cmd|' /C calc'!A0"`);
    expect(sanitizeCsvCell("-1+1")).toBe(`"'-1+1"`);
    expect(sanitizeCsvCell("@SUM(1+1)")).toBe(`"'@SUM(1+1)"`);
    expect(sanitizeCsvCell("\tMaliciousTab")).toBe(`"'\tMaliciousTab"`);
  });

  it("handles normal text and escapes double quotes safely", () => {
    expect(sanitizeCsvCell("Normal Guest Name")).toBe(`"Normal Guest Name"`);
    expect(sanitizeCsvCell('Guest with "Nickname"')).toBe(`"Guest with ""Nickname"""`);
    expect(sanitizeCsvCell("Address, Suite 400")).toBe(`"Address, Suite 400"`);
  });

  it("handles null and undefined values safely", () => {
    expect(sanitizeCsvCell(null)).toBe('""');
    expect(sanitizeCsvCell(undefined)).toBe('""');
  });
});

describe("RFC 4180 Compliant CSV Line Parser", () => {
  it("parses simple comma-separated fields", () => {
    const parsed = parseCsvLine("John Doe,john@example.com,+1234567890,VIP,CONFIRMED");
    expect(parsed).toEqual(["John Doe", "john@example.com", "+1234567890", "VIP", "CONFIRMED"]);
  });

  it("preserves commas inside quoted strings", () => {
    const line = `"Doe, John","john@example.com","+1234567890","VIP","CONFIRMED","Yes",1,"Jane Doe","Vegan, Gluten-Free"`;
    const parsed = parseCsvLine(line);
    expect(parsed[0]).toBe("Doe, John");
    expect(parsed[8]).toBe("Vegan, Gluten-Free");
  });

  it("handles escaped quotes inside quoted fields", () => {
    const line = `"John ""The Boss"" Doe","boss@example.com"`;
    const parsed = parseCsvLine(line);
    expect(parsed[0]).toBe('John "The Boss" Doe');
    expect(parsed[1]).toBe("boss@example.com");
  });

  it("strips formula sanitization quotes transparently on import", () => {
    const line = `"'=HYPERLINK()","test@example.com"`;
    const parsed = parseCsvLine(line);
    expect(parsed[0]).toBe("=HYPERLINK()");
  });
});

describe("Runtime Type Guards Integrity", () => {
  it("validates UserRole accurately", () => {
    expect(isUserRole("ORGANIZER")).toBe(true);
    expect(isUserRole("COORDINATOR")).toBe(true);
    expect(isUserRole("VENDOR")).toBe(true);
    expect(isUserRole("GUEST")).toBe(true);
    expect(isUserRole("ADMIN")).toBe(false);
    expect(isUserRole(null)).toBe(false);
    expect(isUserRole(123)).toBe(false);
  });

  it("validates GuestCategory accurately", () => {
    expect(isGuestCategory("VIP")).toBe(true);
    expect(isGuestCategory("FAMILY")).toBe(true);
    expect(isGuestCategory("FRIENDS")).toBe(true);
    expect(isGuestCategory("COLLEAGUES")).toBe(true);
    expect(isGuestCategory("OTHER")).toBe(true);
    expect(isGuestCategory("UNKNOWN")).toBe(false);
  });

  it("validates RsvpStatus accurately", () => {
    expect(isRsvpStatus("PENDING")).toBe(true);
    expect(isRsvpStatus("CONFIRMED")).toBe(true);
    expect(isRsvpStatus("DECLINED")).toBe(true);
    expect(isRsvpStatus("MAYBE")).toBe(false);
  });

  it("validates TableShape accurately", () => {
    expect(isTableShape("ROUND")).toBe(true);
    expect(isTableShape("RECTANGULAR")).toBe(true);
    expect(isTableShape("CUSTOM")).toBe(true);
    expect(isTableShape("HEXAGONAL")).toBe(false);
  });

  it("validates RiskCategory accurately", () => {
    expect(isRiskCategory("WEATHER")).toBe(true);
    expect(isRiskCategory("VENDOR")).toBe(true);
    expect(isRiskCategory("EQUIPMENT")).toBe(true);
    expect(isRiskCategory("SCHEDULE")).toBe(true);
    expect(isRiskCategory("BUDGET")).toBe(true);
    expect(isRiskCategory("HEALTH_SAFETY")).toBe(true);
    expect(isRiskCategory("LOGISTICS")).toBe(true);
    expect(isRiskCategory("OTHER")).toBe(true);
    expect(isRiskCategory("CYBER")).toBe(false);
  });

  it("validates DocumentCategory accurately", () => {
    expect(isDocumentCategory("CONTRACT")).toBe(true);
    expect(isDocumentCategory("INVOICE")).toBe(true);
    expect(isDocumentCategory("RECEIPT")).toBe(true);
    expect(isDocumentCategory("PERMIT")).toBe(true);
    expect(isDocumentCategory("FLOOR_PLAN")).toBe(true);
    expect(isDocumentCategory("RUNSHEET")).toBe(true);
    expect(isDocumentCategory("OTHER")).toBe(true);
    expect(isDocumentCategory("PASSPORT")).toBe(false);
  });

  it("validates EmergencyContactCategory accurately", () => {
    expect(isEmergencyContactCategory("SECURITY")).toBe(true);
    expect(isEmergencyContactCategory("MEDICAL")).toBe(true);
    expect(isEmergencyContactCategory("VENUE")).toBe(true);
    expect(isEmergencyContactCategory("POLICE")).toBe(true);
    expect(isEmergencyContactCategory("FIRE")).toBe(true);
    expect(isEmergencyContactCategory("KEY_ORGANIZER")).toBe(true);
    expect(isEmergencyContactCategory("VOLUNTEER")).toBe(false);
  });
});

describe("5x5 Risk Assessment Matrix & Scoring", () => {
  it("calculates exact priority score as Likelihood * Severity", () => {
    expect(calculateRiskPriority(5, 5).score).toBe(25);
    expect(calculateRiskPriority(5, 5).level).toBe("CRITICAL");

    expect(calculateRiskPriority(4, 4).score).toBe(16);
    expect(calculateRiskPriority(4, 4).level).toBe("CRITICAL");

    expect(calculateRiskPriority(3, 4).score).toBe(12);
    expect(calculateRiskPriority(3, 4).level).toBe("HIGH");

    expect(calculateRiskPriority(3, 3).score).toBe(9);
    expect(calculateRiskPriority(3, 3).level).toBe("MEDIUM");

    expect(calculateRiskPriority(1, 2).score).toBe(2);
    expect(calculateRiskPriority(1, 2).level).toBe("LOW");
  });

  it("clamps out-of-bound likelihood and severity to 1-5 range", () => {
    const minClamped = calculateRiskPriority(0, -2);
    expect(minClamped.score).toBe(1);

    const maxClamped = calculateRiskPriority(10, 8);
    expect(maxClamped.score).toBe(25);
    expect(maxClamped.level).toBe("CRITICAL");
  });
});

describe("End-to-End Guest CSV Round-Trip with Sanitization", () => {
  it("preserves complex guest data through sanitized CSV export and import", async () => {
    const sampleGuests: LocalGuest[] = [
      {
        id: "g-test-1",
        eventId: "e-test",
        name: "=Dr. Alexander Vance",
        email: "alexander@vance.org",
        phone: "+1-555-0199",
        category: "VIP",
        invitationStatus: "SENT",
        rsvpStatus: "CONFIRMED",
        plusOneAllowed: true,
        plusOneCount: 1,
        plusOneNames: ["Elena Vance"],
        dietaryPreferences: ["Vegan, Nut Allergy"],
        accessibilityRequirements: "Wheelchair ramp access",
        groupName: "Vance Family",
        tableId: null,
        seatNumber: null,
        checkInStatus: false,
        checkedInAt: null,
        notes: "Keynote speaker",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const csvOutput = exportLocalGuestsToCsv(sampleGuests);
    // Verified formula injection defense:
    expect(csvOutput).toContain(`"'=Dr. Alexander Vance"`);
    // Verified embedded comma in quotes:
    expect(csvOutput).toContain(`"Vegan, Nut Allergy"`);

    const result = await importLocalGuestsFromCsv("e-import-target", csvOutput);
    expect(result.created).toBe(1);
    expect(result.errors).toHaveLength(0);
  });
});
