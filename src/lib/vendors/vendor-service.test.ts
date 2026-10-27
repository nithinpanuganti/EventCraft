import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getEventVendors,
  createEventVendor,
  createVendorQuote,
  selectVendorQuote,
  deleteEventVendor,
} from "./vendor-service";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findFirst: vi.fn(),
    },
    vendor: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    vendorQuote: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => cb(prisma)),
  },
}));

describe("Vendor Service & Tenant Isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const USER_A = "user-111";
  const USER_B = "user-222";
  const EVENT_A = "event-aaa";

  it("denies access when User B attempts to view User A's vendors", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue(null);

    const result = await getEventVendors(EVENT_A, USER_B);
    expect(result).toBeNull();
    expect(prisma.event.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: EVENT_A, userId: USER_B },
      })
    );
  });

  it("prevents User B from creating a vendor on User A's event", async () => {
    vi.mocked(prisma.event.findFirst).mockResolvedValue(null);

    await expect(
      createEventVendor(EVENT_A, USER_B, {
        categoryName: "Photography & Video",
        companyName: "Rival Visuals",
      })
    ).rejects.toThrow(/access denied/i);
  });

  it("prevents creating a quote for a vendor belonging to another user's event", async () => {
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue({
      id: "vendor-1",
      eventId: EVENT_A,
      companyName: "Grand Ballroom",
      event: { userId: USER_A },
    } as unknown as Awaited<ReturnType<typeof prisma.vendor.findUnique>>);

    await expect(
      createVendorQuote("vendor-1", USER_B, {
        description: "Full Day Rental",
        quotedAmount: 4500,
      })
    ).rejects.toThrow(/access denied/i);
  });

  it("atomically deselects other quotes when selecting a quotation", async () => {
    vi.mocked(prisma.vendorQuote.findUnique).mockResolvedValue({
      id: "quote-2",
      vendorId: "vendor-1",
      description: "Premium Package",
      vendor: {
        event: { userId: USER_A },
      },
    } as unknown as Awaited<ReturnType<typeof prisma.vendorQuote.findUnique>>);

    await selectVendorQuote("quote-2", USER_A);

    expect(prisma.vendorQuote.updateMany).toHaveBeenCalledWith({
      where: { vendorId: "vendor-1" },
      data: { isSelected: false },
    });

    expect(prisma.vendorQuote.update).toHaveBeenCalledWith({
      where: { id: "quote-2" },
      data: { isSelected: true },
    });
  });

  it("prevents deleting a vendor owned by another user", async () => {
    vi.mocked(prisma.vendor.findUnique).mockResolvedValue({
      id: "vendor-1",
      eventId: EVENT_A,
      companyName: "Decor Pros",
      event: { userId: USER_A },
    } as unknown as Awaited<ReturnType<typeof prisma.vendor.findUnique>>);

    await expect(deleteEventVendor("vendor-1", USER_B)).rejects.toThrow(/access denied/i);
  });

  it("prevents selecting or deleting a quote when eventId does not match the vendor's event", async () => {
    vi.mocked(prisma.vendorQuote.findUnique).mockResolvedValue({
      id: "quote-1",
      vendorId: "vendor-1",
      vendor: {
        eventId: "event-other",
        event: { id: "event-other", userId: USER_A },
      },
    } as unknown as Awaited<ReturnType<typeof prisma.vendorQuote.findUnique>>);

    await expect(selectVendorQuote("quote-1", USER_A, EVENT_A)).rejects.toThrow(
      /does not belong to the specified event/i
    );
  });
});
